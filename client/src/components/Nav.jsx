import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand">
          Mentora<span className="brand-dot">.</span>
        </Link>
        <nav className="nav-links">
          <NavLink to="/courses">Courses</NavLink>
          <NavLink to="/recipes">Recipes</NavLink>
          <NavLink to="/booklets">Booklets</NavLink>
          {user && <NavLink to="/dashboard">Dashboard</NavLink>}
          {user && (user.role === "ADMIN" || user.role === "INSTRUCTOR") && (
            <NavLink to="/admin">Admin</NavLink>
          )}
        </nav>
        <div className="nav-auth">
          {user ? (
            <>
              <span className="nav-user">{user.name}</span>
              <button className="btn btn-ghost" onClick={onLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
