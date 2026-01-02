import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Register = ({ onRegister }) => {
  const [role, setRole] = useState("teacher");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    onRegister(role);
    navigate(role === "teacher" ? "/teacher" : "/student");
  };

  return (
    <div className="panel">
      <h1>Create your account</h1>
      <p className="subtle">
        Choose a role to see the right library experience after registration.
      </p>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="control">
          Role
          <select value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </label>
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
        <button type="submit">Register and continue</button>
      </form>
    </div>
  );
};

export default Register;
