import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../../api.js";

export default function Login ({ onLogin }) {
  const [role, setRole] = useState("teacher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const user = await loginUser({ role, email, password });
      onLogin(user);
      navigate(role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      setError(err.message || "Unable to log in.");
    }
  }

  return (
    <div className="panel">
      <h1>Welcome back</h1>
      <p className="subtle">Pick the role tied to this account.</p>
      <form className="stack" onSubmit={handleSubmit}>
        {error && <p className="notice">{error}</p>}
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
        <label className="control">
          Password
          <input
            type="password"
            value={password}
            onChange={function (event) {
              setPassword(event.target.value);
            }}
            placeholder="••••••••"
          />
        </label>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

Login;
