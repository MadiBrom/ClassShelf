import { Link } from "react-router-dom";

export default function Navbar ({ role, onLogout }) {
  return (
    <nav className="nav">
      <div className="nav__brand">ClassShelf</div>
      <div className="nav__links">
        {!role && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
        {role && (
          <button type="button" onClick={onLogout}>
            Log out
          </button>
        )}
      </div>
    </nav>
  );
};

Navbar;
