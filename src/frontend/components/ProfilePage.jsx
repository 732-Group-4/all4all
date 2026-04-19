import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AvatarIcon from "./profile/AvatarIcon";
import Field from "./shared/Field";
import TextInput from "./shared/TextInput";
import ColorWheelPicker from "./ColorWheelPicker";
import logo from "../../assets/all4allLogo.png";
import {
  validateUsernameFormat,
  validatePhone, formatPhone,
  validateZip, validatePassword,
} from "../../backend/login_utils/validators";
import { getPasswordStrength } from "../../backend/login_utils/passwordStrength";
import "../styles/profile.css";

export default function ProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
  const [form, setForm] = useState({
    ...user,
    avatar: localStorage.getItem("userAvatar") || user?.avatar || null,
  });

  const isVolunteer = user?.role === "VOLUNTEER";

  const [showSettings, setShowSettings] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [saved, setSaved]       = useState(false);
  const [errors, setErrors]     = useState({});

  const [newPass, setNewPass]         = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [passErr, setPassErr]         = useState(null);
  const [confirmErr, setConfirmErr]   = useState(null);

  const fileRef = useRef(null);
  const [displayName, setDisplayName] = useState("");

  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [pastEvents, setPastEvents]             = useState([]);
  const [volunteerBadges, setVolunteerBadges]   = useState([]);

  const str = getPasswordStrength(newPass);

  // ── All data fetching in one useEffect ──
  useEffect(() => {
    if (!user?.id) return;

    fetch(`/api/full_name?user_id=${user.id}`)
      .then(r => r.json())
      .then(data => {
        setDisplayName(data.name);
        if (isVolunteer) {
          const [firstName, ...rest] = data.name.split(" ");
          setForm(f => ({ ...f, firstName, lastName: rest.join(" ") }));
        } else {
          setForm(f => ({ ...f, name: data.name }));
        }
      })
      .catch(console.error);

    fetch(`/api/phone?user_id=${user.id}`)
      .then(r => r.json())
      .then(data => setForm(f => ({ ...f, phone: data.phone })))
      .catch(console.error);

    const zipUrl = isVolunteer
      ? `/api/volunteers/zip_code?user_id=${user.id}`
      : `/api/organizations/zip_code?user_id=${user.id}`;
    fetch(zipUrl)
      .then(r => r.json())
      .then(data => setForm(f => ({ ...f, zip_code: data.zip_code || "" })))
      .catch(console.error);

    if (!isVolunteer) {
      fetch(`/api/organizations/address?user_id=${user.id}`)
        .then(r => r.json())
        .then(data => setForm(f => ({ ...f, address: data.address })))
        .catch(console.error);

      fetch(`/api/organizations/motto?user_id=${user.id}`)
        .then(r => r.json())
        .then(data => setForm(f => ({ ...f, motto: data.motto })))
        .catch(console.error);

      fetch(`/api/organizations/brand_colors?user_id=${user.id}`)
        .then(r => r.json())
        .then(data => setForm(f => ({ ...f, colors: data.colors || [] })))
        .catch(console.error);
    }

    if (isVolunteer) {
      fetch(`/api/volunteers/${user.id}/registrations`)
        .then(r => r.json())
        .then(setRegisteredEvents)
        .catch(console.error);

      fetch(`/api/volunteers/${user.id}/past-events`)
        .then(r => r.json())
        .then(setPastEvents)
        .catch(console.error);

      fetch(`/api/volunteers/${user.id}`)
        .then(r => r.json())
        .then(v => fetch(`/api/volunteers/${v.id}/badges`).then(r => r.json()))
        .then(setVolunteerBadges)
        .catch(console.error);
    }
  }, []);

  // ── Field helpers ──
  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: null }));
  }
  function handlePhone(e) { set("phone", formatPhone(e.target.value)); }

  function handleAvatarFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 100;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL("image/jpeg", 0.6);
      URL.revokeObjectURL(url);
      set("avatar", compressed);
    };
    img.src = url;
  }

  function handleNewPass(e) {
    setNewPass(e.target.value);
    setPassErr(e.target.value ? validatePassword(e.target.value) : null);
    if (confirmPass) setConfirmErr(e.target.value !== confirmPass ? "Passwords do not match." : null);
  }
  function handleConfirmPass(e) {
    setConfirmPass(e.target.value);
    setConfirmErr(newPass !== e.target.value ? "Passwords do not match." : null);
  }

  // ── Validation ──
  function validate() {
    const errs = {};
    const uErr = validateUsernameFormat(form.username);
    if (uErr) errs.username = uErr;
    const zErr = validateZip(form.zip_code);
    if (zErr) errs.zip_code = zErr;
    const pErr = validatePhone(form.phone);
    if (pErr) errs.phone = pErr;
    if (isVolunteer) {
      if (!form.firstName?.trim()) errs.firstName = "First name is required.";
      if (!form.lastName?.trim())  errs.lastName  = "Last name is required.";
    } else {
      if (!form.name?.trim())  errs.name  = "Organization name is required.";
      if (!form.motto?.trim()) errs.motto = "Motto is required.";
    }
    if (newPass) {
      const pErr2 = validatePassword(newPass);
      if (pErr2) errs.newPass = pErr2;
      if (newPass !== confirmPass) errs.confirmPass = "Passwords do not match.";
    }
    return errs;
  }

  // ── Save ──
  async function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const updated = { ...form };
    if (newPass) updated.password = newPass;
    if (updated.avatar) {
      localStorage.setItem("userAvatar", updated.avatar);
      delete updated.avatar;
    }

    try {
      if (isVolunteer) {
        await fetch("/api/volunteers/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            firstName: form.firstName,
            lastName: form.lastName,
            zip_code: form.zip_code,
          }),
        });
      } else {
        await fetch("/api/organizations/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            name: form.name,
            address: form.address,
            zip_code: form.zip_code,
            motto: form.motto,
            brand_colors: form.colors || [],
          }),
        });
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
    }

    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
    setNewPass("");
    setConfirmPass("");
    setErrors({});
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleCancel() {
    setForm({ ...user });
    setNewPass(""); setConfirmPass("");
    setErrors({});
    setEditing(false);
  }

  // ── Reusable settings panel fields ──
  function VolunteerFields() {
    return (
      <>
        <div className="prof-section-title" style={{ marginBottom: 12 }}>Personal Information</div>
        <div className="prof-row">
          <Field label="First Name" error={errors.firstName}>
            {editing
              ? <TextInput value={form.firstName || ""} onChange={e => set("firstName", e.target.value)} error={errors.firstName} placeholder="Jane" />
              : <div className="prof-value">{form.firstName}</div>}
          </Field>
          <Field label="Last Name" error={errors.lastName}>
            {editing
              ? <TextInput value={form.lastName || ""} onChange={e => set("lastName", e.target.value)} error={errors.lastName} placeholder="Doe" />
              : <div className="prof-value">{form.lastName}</div>}
          </Field>
        </div>
        <Field label="Username" error={errors.username}>
          {editing
            ? <TextInput value={form.username || ""} onChange={e => set("username", e.target.value)} error={errors.username} placeholder="jane_doe42" />
            : <div className="prof-value">@{user.username}</div>}
        </Field>
        <Field label="Email" hint="Contact support to change your email.">
          <div className="prof-value prof-value--locked">{user.email}</div>
        </Field>
        <div className="prof-row">
          <Field label="Phone" error={errors.phone}>
            {editing
              ? <TextInput value={form.phone || ""} onChange={handlePhone} error={errors.phone} placeholder="(555) 123-4567" />
              : <div className="prof-value">{form.phone || <span className="prof-value--muted">Not set</span>}</div>}
          </Field>
          <Field label="ZIP Code" error={errors.zip_code}>
            {editing
              ? <TextInput value={form.zip_code || ""} onChange={e => set("zip_code", e.target.value)} error={errors.zip_code} placeholder="90210" />
              : <div className="prof-value">{form.zip_code || <span className="prof-value--muted">Not set</span>}</div>}
          </Field>
        </div>
        {editing && isVolunteer && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <AvatarIcon avatarSrc={form.avatar} size={52} />
              <button className="prof-avatar-edit-btn" onClick={() => fileRef.current.click()} title="Change photo">
                Change Photo
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarFile} />
            </div>
          </>
        )}
      </>
    );
  }

  function OrgFields() {
    return (
      <>
        <div className="prof-section-title" style={{ marginBottom: 12 }}>Organization Information</div>
        <Field label="Organization Name" error={errors.name}>
          {editing
            ? <TextInput value={form.name || ""} onChange={e => set("name", e.target.value)} error={errors.name} placeholder="Green Earth Foundation" />
            : <div className="prof-value">{form.name}</div>}
        </Field>
        <Field label="Username" error={errors.username}>
          {editing
            ? <TextInput value={form.username || ""} onChange={e => set("username", e.target.value)} error={errors.username} placeholder="green_earth_org" />
            : <div className="prof-value">@{user.username}</div>}
        </Field>
        <Field label="Email" hint="Contact support to change your email.">
          <div className="prof-value prof-value--locked">{user.email}</div>
        </Field>
        <div className="prof-row">
          <Field label="Phone" error={errors.phone}>
            {editing
              ? <TextInput value={form.phone || ""} onChange={handlePhone} error={errors.phone} placeholder="(555) 000-0000" />
              : <div className="prof-value">{form.phone || <span className="prof-value--muted">Not set</span>}</div>}
          </Field>
          <Field label="ZIP Code" error={errors.zip_code}>
            {editing
              ? <TextInput value={form.zip_code || ""} onChange={e => set("zip_code", e.target.value)} error={errors.zip_code} placeholder="90210" />
              : <div className="prof-value">{form.zip_code || <span className="prof-value--muted">Not set</span>}</div>}
          </Field>
        </div>
        <Field label="Address" error={null}>
          {editing
            ? <TextInput value={form.address || ""} onChange={e => set("address", e.target.value)} placeholder="123 Main St" />
            : <div className="prof-value">{form.address || <span className="prof-value--muted">Not set</span>}</div>}
        </Field>
        <Field label="Motto / About" error={errors.motto}>
          {editing
            ? <textarea value={form.motto || ""} onChange={e => set("motto", e.target.value)} placeholder="We plant trees…" className={`a4a-textarea${errors.motto ? " error" : ""}`} />
            : <div className="prof-value">{form.motto || <span className="prof-value--muted">Not set</span>}</div>}
        </Field>
        <div className="a4a-field">
          <label className="a4a-label">Brand Colors (up to 4)</label>
          {editing
            ? <ColorWheelPicker selectedColors={form.colors || []} onChange={c => set("colors", c)} />
            : (
              <div className="prof-colors-row">
                {form.colors?.length
                  ? form.colors.map(c => (
                    <div key={c} className="prof-color-chip">
                      <span className="prof-color-chip__swatch" style={{ background: c }} />
                      <span className="prof-color-chip__hex">{c}</span>
                    </div>
                  ))
                  : <span className="prof-value--muted" style={{ fontSize: 13 }}>No brand colors set.</span>}
              </div>
            )}
        </div>
      </>
    );
  }

  function PasswordFields() {
    return (
      <div className="prof-section" style={{ marginTop: 16 }}>
        <div className="prof-section-title">Change Password</div>
        <p className="prof-section-hint">Leave blank to keep your current password.</p>
        <Field label="New Password" error={errors.newPass || passErr}>
          <div className="a4a-pass-wrap">
            <input
              type={showPass ? "text" : "password"}
              value={newPass}
              onChange={handleNewPass}
              placeholder="New password"
              className={`a4a-input${errors.newPass || passErr ? " error" : ""}`}
              autoComplete="new-password"
            />
            <button type="button" className="a4a-eye-btn" onClick={() => setShowPass(s => !s)}>
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
          {newPass && (
            <>
              <div className="a4a-strength-bar">
                <div className="a4a-strength-fill" style={{ width: `${str.pct}%`, background: str.color }} />
              </div>
              <div className="a4a-strength-meta">
                <span className="a4a-strength-label" style={{ color: str.color }}>{str.label}</span>
                <span className="a4a-strength-score">{str.score}/6</span>
              </div>
            </>
          )}
        </Field>
        <Field label="Confirm New Password" error={errors.confirmPass || confirmErr}>
          <TextInput type="password" value={confirmPass} onChange={handleConfirmPass} placeholder="Repeat new password" error={errors.confirmPass || confirmErr} />
        </Field>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="prof-page">

      {/* ── Nav bar (single) ── */}
      <nav className="prof-nav">
        <button className="prof-nav__logo" onClick={() => navigate(isVolunteer ? "/home" : "/org-home")}>
          <img src={logo} alt="All4All logo" style={{ height: 32, width: "auto" }} />
          <span>All4All</span>
        </button>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="prof-nav__back" onClick={() => navigate(isVolunteer ? "/home" : "/org-home")}>
            ← Back to Home
          </button>
        </div>
      </nav>

      <div className="prof-content">

        {/* ── Header card ── */}
        <div className="prof-header-card">
          <div className="prof-avatar-wrap">
            <AvatarIcon avatarSrc={form.avatar} size={88} />
          </div>
          <div className="prof-header-info">
            <div className="prof-header-name">{displayName}</div>
            <div className="prof-header-username">@{user.username}</div>
            <span className={`prof-badge prof-badge--${user.type}`}>
              {isVolunteer ? "Volunteer" : "Organization"}
            </span>
          </div>
          <div className="prof-header-actions">
            <button className="prof-btn" onClick={() => setShowSettings(true)}>
              Edit Profile
            </button>
          </div>
        </div>

        {saved && <div className="prof-toast">Profile updated successfully.</div>}

        {/* ── Volunteer activity sections ── */}
        {isVolunteer && (
          <>
            {/* Registered Events */}
            {registeredEvents.length > 0 && (
              <div className="prof-section">
                <div className="prof-section-title">📋 Registered Events</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {registeredEvents.map(ev => (
                    <div key={ev.id} style={{
                      background: "#f0fdf4", borderRadius: 10, padding: "10px 14px",
                      border: "1px solid #bbf7d0", display: "flex",
                      justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>{ev.name}</div>
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                          📅 {new Date(ev.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {ev.city && ` · 📍 ${ev.city}, ${ev.state}`}
                        </div>
                      </div>
                      <span style={{
                        background: "#15803d", color: "#fff", fontSize: 10, fontWeight: 700,
                        padding: "2px 9px", borderRadius: 99, flexShrink: 0,
                      }}>✓ Registered</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div className="prof-section">
                <div className="prof-section-title">🗓 Past Events</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {pastEvents.map(ev => (
                    <div key={ev.id} style={{
                      background: "#f8fafc", borderRadius: 10, padding: "10px 14px",
                      border: "1px solid #e2e8f0", display: "flex",
                      justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{ev.name}</div>
                        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
                          📅 {new Date(ev.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      {ev.attended ? (
                        <span style={{
                          background: "#f0fdf4", color: "#15803d", fontSize: 10, fontWeight: 700,
                          padding: "2px 9px", borderRadius: 99, border: "1px solid #bbf7d0",
                        }}>✓ Attended</span>
                      ) : (
                        <span style={{
                          background: "#fef9c3", color: "#854d0e", fontSize: 10, fontWeight: 700,
                          padding: "2px 9px", borderRadius: 99, border: "1px solid #fde68a",
                        }}>Not Attended</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Badges */}
            {volunteerBadges.length > 0 && (
              <div className="prof-section">
                <div className="prof-section-title">🏅 Badges Earned</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {volunteerBadges.map((b, i) => (
                    <div key={i} title={b.description} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                      background: "#fafafa", borderRadius: 12, padding: "12px 16px",
                      border: "1.5px solid #e2e8f0", minWidth: 80, textAlign: "center",
                    }}>
                      {b.image_url
                        ? <img src={b.image_url} alt={b.name} style={{ width: 40, height: 40, borderRadius: "50%" }} />
                        : <span style={{ fontSize: 32 }}>🏅</span>}
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{b.name}</span>
                      <span style={{ fontSize: 10, color: "#94a3b8" }}>
                        {new Date(b.earned_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {registeredEvents.length === 0 && pastEvents.length === 0 && volunteerBadges.length === 0 && (
              <div className="prof-section" style={{ textAlign: "center", color: "#94a3b8", padding: "48px 24px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No activity yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Register for events to get started!</div>
              </div>
            )}
          </>
        )}

        {/* ── Org: show description / colors as a summary ── */}
        {!isVolunteer && (
          <div className="prof-section">
            <div className="prof-section-title">Organization Summary</div>
            {form.motto && (
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, borderLeft: "3px solid #15803d", paddingLeft: 14 }}>
                {form.motto}
              </p>
            )}
            {form.colors?.length > 0 && (
              <div className="prof-colors-row" style={{ marginTop: 12 }}>
                {form.colors.map(c => (
                  <div key={c} className="prof-color-chip">
                    <span className="prof-color-chip__swatch" style={{ background: c }} />
                    <span className="prof-color-chip__hex">{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Settings slide-over ── */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
          {/* Backdrop */}
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={() => { setShowSettings(false); setEditing(false); }}
          />

          {/* Panel */}
          <div style={{
            position: "relative", zIndex: 1,
            width: "100%", maxWidth: 480,
            background: "#fff", height: "100%",
            overflowY: "auto", padding: "24px 28px",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
            display: "flex", flexDirection: "column",
          }}>
            {/* Panel header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexShrink: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b" }}>Account Settings</h2>
              <button
                onClick={() => { setShowSettings(false); setEditing(false); }}
                style={{
                  background: "#f1f5f9", border: "none", borderRadius: 8,
                  width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >✕</button>
            </div>

            {/* Fields */}
            <div style={{ flex: 1 }}>
              {isVolunteer ? <VolunteerFields /> : <OrgFields />}
              {editing && <PasswordFields />}
            </div>

            {/* Action buttons */}
            <div style={{ paddingTop: 20, display: "flex", gap: 10, flexShrink: 0 }}>
              {!editing ? (
                <button className="prof-btn" style={{ flex: 1 }} onClick={() => setEditing(true)}>
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    className="prof-btn"
                    style={{ flex: 2 }}
                    onClick={async () => { await handleSave(); setShowSettings(false); }}
                  >
                    Save Changes
                  </button>
                  <button className="prof-btn prof-btn--ghost" style={{ flex: 1 }} onClick={handleCancel}>
                    Cancel
                  </button>
                </>
              )}
            </div>

            {/* Log out */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
              <button
                className="prof-btn prof-btn--danger"
                style={{ width: "100%" }}
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  navigate("/");
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}