import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="container narrow auth-card">
      <h1>Page not found</h1>
      <p className="muted">The page you're looking for doesn't exist.</p>
      <Link className="btn btn-primary" to="/">
        Back home
      </Link>
    </div>
  );
}
