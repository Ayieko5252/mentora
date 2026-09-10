import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("learner@mentora.dev");
  const [password, setPassword] = useState("Learner123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate(location.state?.from || "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow auth-card">
      <h1>Log in</h1>
      <form onSubmit={submit}>
        <label>Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>
      <p className="muted">
        No account? <Link to="/register">Sign up</Link>
      </p>
      <p className="hint">Demo: learner@mentora.dev / Learner123! · admin@mentora.dev / Admin123!</p>
    </div>
  );
}
