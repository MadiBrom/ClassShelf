import { Link } from "react-router-dom";

const Navbar = ({ role, onLogout }) => {
  return (
    <nav className="nav">
      <div className="nav__brand">ClassShelf</div>
      <div className="nav__links">
        {/* <Link to="/library">Library</Link> */}
        {role === "teacher" && <Link to="/teacher">Teacher</Link>}
        {role === "student" && <Link to="/student">Student</Link>}
        {!role && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
        {role && (
          <button type="button" onClick={onLogout}>
            Log out ({role})
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
