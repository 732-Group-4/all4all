import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/home.css";
import logo from "../../assets/all4allLogo.png";

// ─── Mock API helpers ─────────────────────────────────────────────────────────
const API = {
  getVolunteer: async (userId) => {
    const res = await fetch(`/api/volunteers/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch volunteer");
    return res.json();
  },
  getPublishedEvents: async () => {
    const res = await fetch("/api/events");
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json();
  },
};

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

const CATEGORIES = ["All", "Environment", "Food & Hunger", "Education", "Elder Care", "Health", "Animals"];
const DISTANCES  = ["Any Distance", "< 1 mi", "< 2 mi", "< 5 mi", "< 10 mi"];

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ src, name, size = 38 }) {
  if (src) {
    return <img src={src} alt={name} className="home-avatar" style={{ width: size, height: size }} />;
  }
  return (
    <div className="home-avatar--initials" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name)}
    </div>
  );
}

function CategoryPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 99,
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: 12.5,
        fontWeight: active ? 700 : 500,
        background: active ? "#15803d" : "#f1f5f9",  // highlight active
        color: active ? "#fff" : "#475569",
        transition: "all 0.18s",
        whiteSpace: "nowrap",
        boxShadow: active ? "0 2px 8px rgba(37,99,235,0.22)" : "none",
      }}>
      {label}
    </button>
  );
}

function EventCard({ event, onRegister }) {
  const [expanded, setExpanded] = useState(false);
  const hours = calcHours(event.start_time, event.end_time);

  return (
    <div className="home-card">
      <div className="home-card__top">
        <div style={{ flex: 1 }}>
          <div className="home-card__badges">
            {event.category && (
              <span className="home-card__tag home-card__tag--category">{event.category}</span>
            )}
            {hours && (
              <span className="home-card__tag home-card__tag--hours">{hours} hrs</span>
            )}
          </div>
          <h3 className="home-card__title">{event.name}</h3>
          <p className="home-card__org">{event.organization_name}</p>
        </div>
      </div>

      <p className="home-card__desc">{event.description}</p>

      {expanded && event.roles?.length > 0 && (
        <div>
          <p className="home-card__roles-title">Available Roles</p>
          <div className="home-card__roles">
            {event.roles.map(r => (
              <span key={r} className="home-card__role-chip">{r}</span>
            ))}
          </div>
        </div>
      )}

      <div className="home-card__meta">
        <span>📅 {formatDate(event.start_time)} · {formatTime(event.start_time)} – {formatTime(event.end_time)}</span>
        {event.distance_miles != null && (
          <span>📍 {event.city}, {event.state} · {event.distance_miles} mi away</span>
        )}
      </div>

      <div className="home-card__actions">
        <button
          className="home-card__btn home-card__btn--toggle"
          onClick={() => setExpanded(p => !p)}
        >
          {expanded ? "Show less" : "See roles"}
        </button>
        <button
          className="home-card__btn home-card__btn--register"
          onClick={() => onRegister(event)}
        >
          Register
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VolunteerHome() {
  const navigate = useNavigate();

  const [volunteer, setVolunteer]     = useState(null);
  const [events, setEvents]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [activeCategories, setActiveCategories] = useState(["All"]);
  const [distanceFilter, setDistance] = useState("Any Distance");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast]             = useState(null);
  const searchRef = useRef();

  const [categories, setCategories] = useState(["All"]);
  const [categoryErr, setCategoryErr] = useState(null);

  
  function toggleCategory(category) {
    setActiveCategories(prev => {
      // ensure prev is an array
      const arr = Array.isArray(prev) ? prev : [];

      if (category === "All") return ["All"];

      const next = arr.includes(category)
        ? arr.filter(c => c !== category)               // remove if already active
        : [...arr.filter(c => c !== "All"), category];  // add new

      return next.length ? next : ["All"];             // fallback to All if empty
    });
  }

  useEffect(() => {
    API.getPublishedEvents()
      .then(setEvents)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!user) { navigate("/"); return; }
    API.getVolunteer(user.id)
      .then(setVolunteer)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/orgCategories")
      .then((res) => res.json())
      .then((data) => {
        // Ensure "All" is always first
        setCategories(["All", ...data]);
      })
      .catch(() => setCategoryErr("Could not load categories."));
  }, []);

  const filtered = events.filter(ev => {
    const q = search.toLowerCase();
    const matchSearch = !q || ev.name?.toLowerCase().includes(q) || ev.description?.toLowerCase().includes(q) || ev.organization_name?.toLowerCase().includes(q) || ev.city?.toLowerCase().includes(q);
    const matchCat = activeCategories.includes("All") || activeCategories.includes(ev.category);
    const maxDist   = { "< 1 mi": 1, "< 2 mi": 2, "< 5 mi": 5, "< 10 mi": 10 }[distanceFilter];
    const matchDist = !maxDist || (ev.distance_miles != null && ev.distance_miles < maxDist);
    const matchFrom = !dateFrom || new Date(ev.start_time) >= new Date(dateFrom);
    const matchTo   = !dateTo   || new Date(ev.start_time) <= new Date(dateTo + "T23:59:59");
    return matchSearch && matchCat && matchDist && matchFrom && matchTo;
  });

  function handleRegister(event) {
    setToast(`Registered for "${event.name}"! 🎉`);
    setTimeout(() => setToast(null), 3500);
  }

  if (loading) {
    return (
      <div className="home-loading">
        <div className="home-loading__text">Loading…</div>
      </div>
    );
  }

  return (
    <div className="home-page">

      {/* ── Nav ── */}
      <nav className="home-nav">
        <div className="home-nav__logo">
          <div className="home-nav__logo-icon">
            <img src={logo} alt="All4All Logo" className="home-nav__logo-img" />
          </div>
          <span className="home-nav__logo-text">All4All</span>
        </div>
        <button
          className="home-nav__profile-btn"
          onClick={() => navigate("/profile")}
          title="View profile"
        >
          <Avatar src={volunteer?.profile_pic} name={volunteer?.full_name} size={36} />
        </button>
      </nav>

      <main className="home-main">

        {/* ── Welcome card ── */}
        <section className="home-welcome-card">
          <div className="home-welcome-left">
            <Avatar src={volunteer?.profile_pic} name={volunteer?.full_name} size={52} />
            <div className="home-welcome-text">
              <p>Welcome Back! </p>
              <h2>{volunteer?.full_name}</h2>
            </div>
          </div>
          <div className="home-badge">
            <span className="home-badge__value">{volunteer?.hours_completed ?? "—"}</span>
            <span className="home-badge__label">Hours Completed</span>
          </div>
        </section>

        {/* ── Search + Filters ── */}
        <section className="home-search-section">
          <div className="home-search-row">
            <div className="home-search-wrap">
              <span className="home-search-icon">🔍</span>
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search events or organizations…"
                className="home-search-input"
              />
            </div>
            <button
              className={`home-filter-btn${showFilters ? " active" : ""}`}
              onClick={() => setShowFilters(p => !p)}
            >
              Filters {showFilters ? "▲" : "▼"}
            </button>
          </div>

          <div className="home-pills">
            {categories.map(c => {
                  const name = c.name || c;

                  return (
                    <CategoryPill
                      key={c.id || name}
                      label={name}
                      active={activeCategories.includes(name)}
                      onClick={() => toggleCategory(name)}
                    />
                  );
                })}
          </div>

          {showFilters && (
            <div className="home-filter-panel">
              <div className="home-filter-group">
                <label className="home-filter-label">Distance</label>
                <select className="home-filter-select" value={distanceFilter} onChange={e => setDistance(e.target.value)}>
                  {DISTANCES.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="home-filter-group">
                <label className="home-filter-label">From</label>
                <input type="date" className="home-filter-date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="home-filter-group">
                <label className="home-filter-label">To</label>
                <input type="date" className="home-filter-date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <button className="home-filter-clear" onClick={() => { setDistance("Any Distance"); setDateFrom(""); setDateTo(""); setCategory(["All"]); }}>
                Clear all
              </button>
            </div>
          )}
        </section>

        {/* ── Results ── */}
        <div className="home-results-header">
          <h3 className="home-results-count">
            {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="home-empty">No events match your filters. Try adjusting your search!</div>
        ) : (
          <div className="home-cards">
            {filtered.map(ev => (
              <EventCard key={ev.id} event={ev} onRegister={handleRegister} />
            ))}
          </div>
        )}
      </main>

      {/* ── Toast ── */}
      {toast && <div className="home-toast">{toast}</div>}
    </div>
  );
}