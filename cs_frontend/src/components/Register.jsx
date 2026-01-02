import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../../api.js";

export default function Register ({ onRegister }) {
  const [role, setRole] = useState("teacher");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const user = await registerUser({ role, name, email, password });
      onRegister(user);
      navigate(role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      setError(err.message || "Unable to register.");
    }
  }

  return (
    <div className="panel">
      <h1>Create your account</h1>
      <p className="subtle">
        Choose a role to see the right library experience after registration.
      </p>
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
          Name
          <input
            type="text"
            value={name}
            onChange={function (event) {
              setName(event.target.value);
            }}
            placeholder="Avery Johnson"
          />
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
            placeholder="Create a password"
          />
        </label>
        <button type="submit">Register and continue</button>
      </form>
    </div>
  );
};

Register;
