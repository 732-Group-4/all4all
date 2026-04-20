import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Field from "./shared/Field";
import TextInput from "./shared/TextInput";

export default function SignIn({ onSwitch }) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
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
        const message = await res.text();
        throw new Error(message);
      }

      const data = await res.json();

      // Save session to localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      console.log("Successfully signed in user:", data.user.username);

      // Redirect based on role
      if (data.user.role === "VOLUNTEER") {
        navigate("/home");

      } else if (data.user.role === "ORGANIZATION") {
        navigate("/org-home"); // build this page later
      }

    } catch (err) {
      console.error(err);
      setError(err);
    }

    setLoading(false);
  }

  return (
    <div>
      <p className="a4a-intro a4a-intro--lg">Welcome back! Sign in to continue making a difference.</p>

      <Field label="Username" error={null}>
        <TextInput
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your Username"
        />
      </Field>

      <Field label="Password" error={null}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your Password"
          className="a4a-input"
        />
      </Field>

      {error && <p className="a4a-err">{error}</p>}

      <button type="button" className="a4a-btn" disabled={loading} onClick={handleSubmit}>
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <div className="a4a-switch-link">
        Don't have an account?{" "}
        <button className="a4a-switch-btn" onClick={() => onSwitch("volunteer")}>Create one</button>
      </div>
    </div>
  );
}