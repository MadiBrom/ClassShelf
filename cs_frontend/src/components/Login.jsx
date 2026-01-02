import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../../api.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const user = await loginUser({ email, password });
      onLogin(user);

      if (user.role === "teacher") navigate("/teacher");
      else navigate("/student");
    } catch (err) {
      setError(err.message || "Unable to log in.");
    }
  };

  return (
    <div className="panel">
      <h1>Welcome back</h1>
      <p className="subtle">Log in and we will take you to the right dashboard.</p>

      <form className="stack" onSubmit={handleSubmit}>
        {error && <p className="notice">{error}</p>}

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
            placeholder="••••••••"
          />
        </label>

        <button type="submit">Login</button>
      </form>
    </div>
  );
}
Login;