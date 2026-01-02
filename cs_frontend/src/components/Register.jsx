import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../../api.js";

export default function Register({ onRegister }) {
  const [role, setRole] = useState("teacher");
  const [shelfCode, setShelfCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const payload = { role, name, email, password };
      if (role === "student") payload.shelfCode = shelfCode.trim();

      const user = await registerUser(payload);
      onRegister(user);

      if (user.role === "teacher") navigate("/teacher");
      else navigate("/student");
    } catch (err) {
      setError(err.message || "Unable to register.");
    }
  };

  return (
    <div className="panel">
      <h1>Create your account</h1>
      <p className="subtle">Pick your role once. After that, your account decides your view.</p>

      <form className="stack" onSubmit={handleSubmit}>
        {error && <p className="notice">{error}</p>}

        <label className="control">
          Role
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </label>

        {role === "student" && (
          <label className="control">
            Shelf code
            <input
              type="text"
              value={shelfCode}
              onChange={(event) => setShelfCode(event.target.value)}
              placeholder="Ask your teacher for this"
            />
          </label>
        )}

        <label className="control">
          Name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Avery Johnson"
          />
        </label>

        <label className="control">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@classshelf.com"
          />
        </label>

        <label className="control">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create a password"
          />
        </label>

        <button type="submit">Register and continue</button>
      </form>
    </div>
  );
}
Register;