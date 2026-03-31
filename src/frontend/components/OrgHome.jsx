import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function calcHours(start, end) {
  if (!start || !end) return null;
  const diff = (new Date(end) - new Date(start)) / 36e5;
  return diff > 0 ? diff.toFixed(1) : null;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_EVENTS = [
  {
    id: 1, name: "River Cleanup Drive", status: "PUBLISHED",
    description: "Join us for a morning cleaning up litter along the Genesee River trail.",
    organization_name: "Clean Earth Rochester", category: "Environment",
    roles: ["Litter Collector", "Team Leader"],
    start_time: "2026-04-12T09:00:00", end_time: "2026-04-12T12:00:00",
    address: "500 Genesee Park Blvd", city: "Rochester", state: "NY", zip_code: "14619", distance_miles: 1.4,
  },
  {
    id: 2, name: "Community Food Pantry", status: "PUBLISHED",
    description: "Help sort and distribute food donations at our weekly food pantry.",
    organization_name: "Feed ROC", category: "Food & Hunger",
    roles: ["Food Sorter", "Greeter"],
    start_time: "2026-04-15T14:00:00", end_time: "2026-04-15T17:00:00",
    address: "274 N Goodman St", city: "Rochester", state: "NY", zip_code: "14607", distance_miles: 2.1,
  },
  {
    id: 3, name: "Youth Coding Workshop", status: "PUBLISHED",
    description: "Mentor middle-school students learning Scratch and Python basics.",
    organization_name: "Tech Kids ROC", category: "Education",
    roles: ["Coding Mentor"],
    start_time: "2026-04-18T16:00:00", end_time: "2026-04-18T18:30:00",
    address: "39 Main St E", city: "Rochester", state: "NY", zip_code: "14604", distance_miles: 3.7,
  },
];

const CATEGORIES = ["All", "Environment", "Food & Hunger", "Education", "Elder Care", "Health", "Animals"];
const DISTANCES  = ["Any Distance", "< 1 mi", "< 2 mi", "< 5 mi", "< 10 mi"];
const US_STATES  = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ src, name, size = 38 }) {
  return src
    ? <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />
    : (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: size * 0.36, letterSpacing: 0.5, flexShrink: 0,
      }}>
        {initials(name)}
      </div>
    );
}

function StatBadge({ value, label, color = "#2563eb" }) {
  return (
    <div style={{
      background: `linear-gradient(135deg,${color} 0%,${color}cc 100%)`,
      borderRadius: 16, padding: "16px 24px", color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center",
      boxShadow: `0 8px 24px ${color}44`, minWidth: 120,
    }}>
      <span style={{ fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, marginTop: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function CategoryPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer",
      fontFamily: "inherit", fontSize: 12.5, fontWeight: active ? 700 : 500,
      background: active ? "#2563eb" : "#f1f5f9",
      color: active ? "#fff" : "#475569",
      transition: "all 0.18s", whiteSpace: "nowrap",
      boxShadow: active ? "0 2px 8px rgba(37,99,235,0.22)" : "none",
    }}>
      {label}
    </button>
  );
}

function EventCard({ event, isOwnEvent, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const hours = calcHours(event.start_time, event.end_time);
  const isDraft = event.status === "DRAFT";

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "20px 22px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid ${isOwnEvent ? "#bfdbfe" : "#e2e8f0"}`,
      transition: "transform 0.18s, box-shadow 0.18s",
      display: "flex", flexDirection: "column", gap: 12,
      position: "relative",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.10)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"; }}
    >
      {/* Own event banner */}
      {isOwnEvent && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: isDraft ? "#fef9c3" : "#eff6ff",
          color: isDraft ? "#854d0e" : "#1d4ed8",
          border: `1px solid ${isDraft ? "#fde68a" : "#bfdbfe"}`,
          borderRadius: 99, fontSize: 10.5, fontWeight: 700,
          padding: "2px 9px", letterSpacing: 0.3, textTransform: "uppercase",
        }}>
          {isDraft ? "Draft" : "Your Event"}
        </div>
      )}

      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            {event.category && (
              <span style={{
                background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 700,
                padding: "2px 9px", borderRadius: 99, border: "1px solid #bfdbfe",
              }}>
                {event.category}
              </span>
            )}
            {hours && (
              <span style={{
                background: "#f0fdf4", color: "#15803d", fontSize: 11, fontWeight: 700,
                padding: "2px 9px", borderRadius: 99, border: "1px solid #bbf7d0",
              }}>
                {hours} hrs
              </span>
            )}
          </div>
          <h3 style={{ fontSize: 15.5, fontWeight: 800, color: "#1e293b", lineHeight: 1.3 }}>{event.name}</h3>
          <p style={{ fontSize: 12.5, color: "#2563eb", fontWeight: 600, marginTop: 2 }}>
            {event.organization_name || "Your Organization"}
          </p>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>{event.description}</p>

      {expanded && event.roles?.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Available Roles
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {event.roles.map(r => (
              <span key={r} style={{
                background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 8, padding: "4px 10px", fontSize: 12.5, color: "#334155", fontWeight: 500,
              }}>{r}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12.5, color: "#64748b" }}>
        <span>📅 {formatDate(event.start_time)} · {formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
        {event.city && <span>📍 {event.city}, {event.state} · {event.distance_miles} mi away</span>}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        {event.roles?.length > 0 && (
          <button onClick={() => setExpanded(p => !p)} style={{
            background: "none", border: "1.5px solid #e2e8f0", borderRadius: 8,
            padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: "#475569",
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
          >
            {expanded ? "Show less" : "See roles"}
          </button>
        )}
        {isOwnEvent ? (
          <>
            <button onClick={() => onEdit(event)} style={{
              flex: 1, background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
              border: "none", borderRadius: 8, padding: "7px 14px",
              fontSize: 12.5, fontWeight: 700, color: "#fff",
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
            }}>
              Edit Event
            </button>
            <button onClick={() => onDelete(event)} style={{
              background: "#fff", border: "1.5px solid #fecaca", borderRadius: 8,
              padding: "7px 14px", fontSize: 12.5, fontWeight: 700, color: "#ef4444",
              cursor: "pointer", fontFamily: "inherit",
            }}>
              Delete
            </button>
          </>
        ) : (
          <div style={{
            flex: 1, background: "#f8fafc", border: "1.5px solid #e2e8f0",
            borderRadius: 8, padding: "7px 14px", fontSize: 12.5,
            fontWeight: 600, color: "#94a3b8", textAlign: "center",
          }}>
            View Only
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create/Edit Event Modal ──────────────────────────────────────────────────
function EventModal({ event, orgId, onClose, onSaved }) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    name: event?.name || "",
    description: event?.description || "",
    start_time: event?.start_time?.slice(0, 16) || "",
    end_time: event?.end_time?.slice(0, 16) || "",
    address: event?.address || "",
    city: event?.city || "",
    state: event?.state || "NY",
    zip_code: event?.zip_code || "",
    status: event?.status || "DRAFT",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitErr, setSubmitErr] = useState(null);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: null }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Event name is required.";
    if (!form.description.trim()) errs.description = "Description is required.";
    if (!form.start_time) errs.start_time = "Start time is required.";
    if (!form.end_time) errs.end_time = "End time is required.";
    if (form.start_time && form.end_time && new Date(form.end_time) <= new Date(form.start_time))
      errs.end_time = "End time must be after start time.";
    if (!form.zip_code.trim()) errs.zip_code = "ZIP code is required.";
    return errs;
  }

  async function handleSubmit(status) {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setSubmitErr(null);
    try {
      const payload = { ...form, status, organization_id: orgId };
      const url = isEdit ? `/api/events/${event.id}` : "/api/events";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save event");
      const saved = await res.json();
      onSaved(saved, isEdit);
      onClose();
    } catch (err) {
      console.error(err);
      setSubmitErr("Failed to save event. Please try again.");
    }
    setLoading(false);
  }

  const inputStyle = (err) => ({
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: `1.5px solid ${err ? "#fca5a5" : "#e2e8f0"}`,
    fontSize: 13.5, fontFamily: "inherit", color: "#1e293b",
    outline: "none", background: "#fff", boxSizing: "border-box",
  });
  const labelStyle = { fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 5 };
  const errStyle = { fontSize: 11.5, color: "#ef4444", marginTop: 3 };
  const fieldStyle = { marginBottom: 14 };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "28px 28px 24px",
        width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: "#1e293b" }}>
            {isEdit ? "Edit Event" : "Create New Event"}
          </h2>
          <button onClick={onClose} style={{
            background: "#f1f5f9", border: "none", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Event Name *</label>
          <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Community Cleanup Day" style={inputStyle(errors.name)} />
          {errors.name && <div style={errStyle}>{errors.name}</div>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Description *</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)}
            placeholder="Describe the event, what volunteers will do, what to bring…"
            style={{ ...inputStyle(errors.description), minHeight: 90, resize: "vertical" }} />
          {errors.description && <div style={errStyle}>{errors.description}</div>}
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Start Time *</label>
            <input type="datetime-local" value={form.start_time} onChange={e => set("start_time", e.target.value)} style={inputStyle(errors.start_time)} />
            {errors.start_time && <div style={errStyle}>{errors.start_time}</div>}
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>End Time *</label>
            <input type="datetime-local" value={form.end_time} onChange={e => set("end_time", e.target.value)} style={inputStyle(errors.end_time)} />
            {errors.end_time && <div style={errStyle}>{errors.end_time}</div>}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Address</label>
          <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Main St" style={inputStyle(false)} />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 2 }}>
            <label style={labelStyle}>City</label>
            <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Rochester" style={inputStyle(false)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>State</label>
            <select value={form.state} onChange={e => set("state", e.target.value)} style={inputStyle(false)}>
              {US_STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>ZIP *</label>
            <input value={form.zip_code} onChange={e => set("zip_code", e.target.value)} placeholder="14604" style={inputStyle(errors.zip_code)} />
            {errors.zip_code && <div style={errStyle}>{errors.zip_code}</div>}
          </div>
        </div>

        {submitErr && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{submitErr}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={() => handleSubmit("DRAFT")} disabled={loading} style={{
            flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid #e2e8f0",
            background: "#f8fafc", color: "#475569", fontSize: 13.5, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            {loading ? "Saving…" : "Save as Draft"}
          </button>
          <button onClick={() => handleSubmit("PUBLISHED")} disabled={loading} style={{
            flex: 2, padding: "10px 0", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff",
            fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
          }}>
            {loading ? "Publishing…" : "Publish Event"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrgHome() {
  const navigate = useNavigate();

  const [org, setOrg]                 = useState(null);
  const [allEvents, setAllEvents]     = useState(MOCK_EVENTS);
  const [myEvents, setMyEvents]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState("browse"); // "browse" | "my-events"
  const [search, setSearch]           = useState("");
  const [activeCategory, setCategory] = useState("All");
  const [distanceFilter, setDistance] = useState("Any Distance");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast]             = useState(null);
  const [showModal, setShowModal]     = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const searchRef = useRef();

  const user = JSON.parse(localStorage.getItem("user") || "null");

  useEffect(() => {
    if (!user) { navigate("/"); return; }

    // Fetch org profile
    fetch(`/api/organizations/by-user/${user.id}`)
      .then(r => r.json())
      .then(setOrg)
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch all published events
    fetch("/api/events")
      .then(r => r.json())
      .then(setAllEvents)
      .catch(() => setAllEvents(MOCK_EVENTS));
  }, []);

  useEffect(() => {
    if (!org?.id) return;
    fetch(`/api/organizations/${org.id}/events`)
      .then(r => r.json())
      .then(setMyEvents)
      .catch(() => setMyEvents([]));
  }, [org]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  function handleSavedEvent(saved, isEdit) {
    if (isEdit) {
      setMyEvents(prev => prev.map(e => e.id === saved.id ? saved : e));
      showToast("Event updated! ✅");
    } else {
      setMyEvents(prev => [saved, ...prev]);
      showToast("Event created! 🎉");
    }
  }

  async function handleDelete(event) {
    if (!window.confirm(`Delete "${event.name}"?`)) return;
    try {
      await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      setMyEvents(prev => prev.filter(e => e.id !== event.id));
      showToast("Event deleted.");
    } catch {
      showToast("Failed to delete event.");
    }
  }

  // ── Filter all events ──
  const myEventIds = new Set(myEvents.map(e => e.id));
  const filtered = allEvents.filter(ev => {
    const q = search.toLowerCase();
    const matchSearch = !q || ev.name?.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q) || ev.organization_name?.toLowerCase().includes(q);
    const matchCat = activeCategory === "All" || ev.category === activeCategory;
    const maxDist = { "< 1 mi": 1, "< 2 mi": 2, "< 5 mi": 5, "< 10 mi": 10 }[distanceFilter];
    const matchDist = !maxDist || (ev.distance_miles != null && ev.distance_miles < maxDist);
    const matchFrom = !dateFrom || new Date(ev.start_time) >= new Date(dateFrom);
    const matchTo   = !dateTo   || new Date(ev.start_time) <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchCat && matchDist && matchFrom && matchTo;
  });

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#eff6ff 0%,#dbeafe 40%,#bfdbfe 100%)" }}>
        <div style={{ color: "#2563eb", fontWeight: 700, fontSize: 16 }}>Loading…</div>
      </div>
    );
  }

  const publishedCount = myEvents.filter(e => e.status === "PUBLISHED").length;
  const draftCount = myEvents.filter(e => e.status === "DRAFT").length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#eff6ff 0%,#dbeafe 40%,#bfdbfe 100%)",
      fontFamily: "'Nunito','Segoe UI',sans-serif",
    }}>

      {/* ── Top Nav ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.90)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #e2e8f0",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>🤝</div>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#1d4ed8", letterSpacing: -0.5 }}>All4All</span>
        </div>
        <button
          onClick={() => navigate("/profile")}
          title="View profile"
          style={{
            background: "none", border: "2px solid #2563eb",
            borderRadius: "50%", padding: 2, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.18)"; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
        >
          <Avatar src={org?.logo_url} name={org?.name || user?.username} size={36} />
        </button>
      </nav>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 16px 64px" }}>

        {/* ── Header card ── */}
        <section style={{
          background: "#fff", borderRadius: 20,
          boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid #e2e8f0",
          padding: "24px 28px", marginBottom: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar src={org?.logo_url} name={org?.name || user?.username} size={52} />
            <div>
              <p style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Organization Dashboard 🏢</p>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: "#1e293b", lineHeight: 1.2 }}>
                {org?.name || user?.username}
              </h2>
              {org?.description && (
                <p style={{ fontSize: 12.5, color: "#64748b", marginTop: 2, maxWidth: 340 }}>{org.description}</p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatBadge value={publishedCount} label="Published" color="#2563eb" />
            <StatBadge value={draftCount} label="Drafts" color="#7c3aed" />
            <StatBadge value={myEvents.length} label="Total Events" color="#0891b2" />
          </div>
        </section>

        {/* ── Tabs + Create button ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 12, padding: 4 }}>
            {[["browse", "🌐 Browse Events"], ["my-events", "📋 My Events"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                background: tab === key ? "#fff" : "transparent",
                color: tab === key ? "#2563eb" : "#64748b",
                boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                transition: "all 0.18s",
              }}>{label}</button>
            ))}
          </div>
          <button onClick={() => { setEditingEvent(null); setShowModal(true); }} style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff",
            fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 2px 8px rgba(37,99,235,0.30)",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            + Create Event
          </button>
        </div>

        {/* ── My Events Tab ── */}
        {tab === "my-events" && (
          <div>
            {myEvents.length === 0 ? (
              <div style={{
                background: "#fff", borderRadius: 16, padding: "48px 24px",
                textAlign: "center", color: "#94a3b8", fontSize: 14, fontWeight: 500,
                border: "1.5px dashed #bfdbfe",
              }}>
                No events yet. Create your first event to get started!
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {myEvents.map(ev => (
                  <EventCard
                    key={ev.id} event={ev} isOwnEvent={true}
                    onEdit={e => { setEditingEvent(e); setShowModal(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Browse Tab ── */}
        {tab === "browse" && (
          <>
            {/* Search + filters */}
            <section style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
                  <input
                    ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search events or organizations…"
                    style={{
                      width: "100%", padding: "11px 14px 11px 40px", borderRadius: 12,
                      border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "inherit",
                      fontWeight: 500, outline: "none", background: "#fff", color: "#1e293b",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "#2563eb"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                  />
                </div>
                <button onClick={() => setShowFilters(p => !p)} style={{
                  padding: "11px 18px", borderRadius: 12, cursor: "pointer",
                  border: showFilters ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0",
                  background: showFilters ? "#eff6ff" : "#fff",
                  color: showFilters ? "#2563eb" : "#475569",
                  fontFamily: "inherit", fontWeight: 600, fontSize: 13.5,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  ⚙️ Filters {showFilters ? "▲" : "▼"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                {CATEGORIES.map(c => (
                  <CategoryPill key={c} label={c} active={c === activeCategory} onClick={() => setCategory(c)} />
                ))}
              </div>

              {showFilters && (
                <div style={{
                  marginTop: 12, background: "#fff", borderRadius: 14,
                  border: "1.5px solid #e2e8f0", padding: "18px 20px",
                  display: "flex", flexWrap: "wrap", gap: 18,
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Distance</label>
                    <select value={distanceFilter} onChange={e => setDistance(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", color: "#334155", background: "#fff", cursor: "pointer", outline: "none" }}>
                      {DISTANCES.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>From</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", color: "#334155", background: "#fff", outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>To</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", color: "#334155", background: "#fff", outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button onClick={() => { setDistance("Any Distance"); setDateFrom(""); setDateTo(""); setCategory("All"); }} style={{ background: "none", border: "1.5px solid #fca5a5", borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: "#ef4444", cursor: "pointer", fontFamily: "inherit" }}>
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </section>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>
                {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
              </h3>
            </div>

            {filtered.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, padding: "48px 24px", textAlign: "center", color: "#94a3b8", fontSize: 14, fontWeight: 500, border: "1.5px dashed #e2e8f0" }}>
                No events match your filters.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {filtered.map(ev => (
                  <EventCard
                    key={ev.id} event={ev}
                    isOwnEvent={myEventIds.has(ev.id)}
                    onEdit={e => { setEditingEvent(e); setShowModal(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Create/Edit Modal ── */}
      {showModal && (
        <EventModal
          event={editingEvent}
          orgId={org?.id}
          onClose={() => { setShowModal(false); setEditingEvent(null); }}
          onSaved={handleSavedEvent}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: "#1d4ed8", color: "#fff", borderRadius: 12,
          padding: "12px 24px", fontSize: 14, fontWeight: 700,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)", zIndex: 9999,
          whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #bfdbfe; border-radius: 99px; }
      `}</style>
    </div>
  );
}