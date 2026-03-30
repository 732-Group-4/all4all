import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "./login_css_vals.css";

import SignIn from "./components/SignIn";
import VolunteerForm from "./components/VolunteerForm";
import OrgForm from "./components/OrgForm";
import VolunteerHome from "./components/VolunteerHome";
import ProfilePage from "./components/ProfilePage";

// ── Login page (tabs for sign in / register) ──────────────────────────────────
function LoginPage() {
  const [tab, setTab] = useState("signin");

  const tabConfig = [
    { id: "signin",    label: "Sign In" },
    { id: "volunteer", label: "Join as Volunteer" },
    { id: "org",       label: "Register Org" },
  ];

  return (
    <div className="a4a-page">
      <div className="a4a-card">

        <div className="a4a-header">
          <div className="a4a-logo">All4All</div>
          <div className="a4a-tagline">Connecting volunteers with organizations that need them most.</div>
        </div>

        <div className="a4a-tabs">
          {tabConfig.map((t) => (
            <button
              key={t.id}
              className={`a4a-tab${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="a4a-body">
          {tab === "signin"    && <SignIn        onSwitch={setTab} />}
          {tab === "volunteer" && <VolunteerForm onSwitch={setTab} />}
          {tab === "org"       && <OrgForm       onSwitch={setTab} />}
        </div>

      </div>
    </div>
  );
}

// ── App with routes ───────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      <Route path="/"     element={<LoginPage />} />
      <Route path="/home" element={<VolunteerHome />} />
      <Route path="/profile" element={<ProfilePage />} />
      {/* <Route path="/org-home" element={<OrgHome />} /> */}
      {/* <Route path="/profile"  element={<Profile />} /> */}
    </Routes>
  );
}