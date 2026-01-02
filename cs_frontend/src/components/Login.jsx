import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login ({ onLogin }) {
  const [role, setRole] = useState("teacher");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    onLogin(role);
    navigate(role === "teacher" ? "/teacher" : "/student");
  }

  return (
    <div className="panel">
      <h1>Welcome back</h1>
      <p className="subtle">Pick the role tied to this account.</p>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="control">
          Role
          <select
            value={role}
            onChange={function (event) {
              setRole(event.target.value);
            }}
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </label>
        <label className="control">
          Email
          <input
            type="email"
            value={email}
            onChange={function (event) {
              setEmail(event.target.value);
            }}
            placeholder="you@classshelf.com"
          />
        </label>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

Login;
