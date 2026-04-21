import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Field from "./shared/Field";
import TextInput from "./shared/TextInput";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000; 

export default function SignIn({ onSwitch }) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // FIX [4]: Track failed attempts to provide a client-side lockout.
  // This does NOT replace server-side rate limiting, which is still required.
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  const isLocked = lockedUntil && Date.now() < lockedUntil;

  async function handleSubmit() {
    // FIX [4]: Refuse submission while locked out
    if (isLocked) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Please wait ${secs}s before trying again.`);
      return;
    }

    if (!username || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        // FIX [3]: Always derive a plain string for the error state.
        // FIX [2]: Do not console.error the raw server response.
        const text = await res.text();
        // Use a generic message for the user; avoid echoing raw server internals.
        const userMessage = res.status === 401
          ? "Invalid username or password."
          : "Sign in failed. Please try again.";

        // FIX [4]: Increment attempt counter and lock if threshold reached
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_MS);
          setAttempts(0);
          setError(`Too many failed attempts. Please wait ${LOCKOUT_MS / 1000}s before trying again.`);
        } else {
          setError(userMessage);
        }

        // Suppress the raw error — log to a monitoring service in production instead
        void text;
        setLoading(false);
        return;
      }

      const data = await res.json();

      // FIX [1]: Do not log user details to the console after sign-in.
      // FIX [5]: Store only the minimal fields needed for client-side display.
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify({
        id:       data.user.id,
        username: data.user.username,
        email:    data.user.email,
        role:     data.user.role,
      }));

      // Reset attempt counter on success
      setAttempts(0);
      setLockedUntil(null);

      // Redirect based on role
      if (data.user.role === "VOLUNTEER") {
        navigate("/home");
      } else if (data.user.role === "ORGANIZATION") {
        navigate("/org-home");
      }

    } catch {
      // FIX [2] & [3]: Don't console.error or store the raw Error object.
      setError("An unexpected error occurred. Please try again.");
    }

    setLoading(false);
  }

  return (
    <div>
      <p className="a4a-intro a4a-intro--lg">Welcome back! Sign in to continue making a difference.</p>

      {/* FIX [6]: Add autoComplete attributes for password managers and security scanners */}
      <Field label="Username" error={null}>
        <TextInput
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your Username"
          autoComplete="username"
        />
      </Field>

      <Field label="Password" error={null}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your Password"
          className="a4a-input"
          autoComplete="current-password"
        />
      </Field>

      {/* FIX [3]: error is always a string, safe to render directly */}
      {error && <p className="a4a-err">{error}</p>}

      <button
        type="button"
        className="a4a-btn"
        disabled={loading || isLocked}
        onClick={handleSubmit}
      >
        {loading ? "Signing in…" : isLocked ? "Too many attempts…" : "Sign In"}
      </button>

      <div className="a4a-switch-link">
        Don't have an account?{" "}
        <button className="a4a-switch-btn" onClick={() => onSwitch("volunteer")}>Create one</button>
      </div>
    </div>
  );
}