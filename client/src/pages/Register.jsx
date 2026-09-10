import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow auth-card">
      <h1>Create your account</h1>
      <form onSubmit={submit}>
        <label>Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <label>Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="hint">At least 8 characters.</p>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Creating…" : "Sign up"}
        </button>
      </form>
      <p className="muted">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
