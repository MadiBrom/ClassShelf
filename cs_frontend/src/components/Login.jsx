import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../../../utils/api.js";

const DRAFT_STORAGE_KEY = "classShelfLoginDraft";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const stored = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) return;

    try {
      const draft = JSON.parse(stored);
      if (draft?.email) setEmail(draft.email);
      if (draft?.password) setPassword(draft.password);
    } catch (err) {
      window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({ email, password })
    );
  }, [email, password]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const user = await loginUser({ email, password });
      onLogin(user);
      window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);

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
