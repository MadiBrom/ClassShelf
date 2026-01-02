import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/nav.jsx";
import Register from "./components/register.jsx";
import Login from "./components/login.jsx";
import Student from "./components/Profiles/student.jsx";
import Teacher from "./components/Profiles/teacher.jsx";

function App() {
  const [role, setRole] = useState("");

  useEffect(function () {
    const storedRole = window.localStorage.getItem("classShelfRole") || "";
    setRole(storedRole);
  }, []);

  function handleRoleChange(nextRole) {
    if (!nextRole) {
      window.localStorage.removeItem("classShelfRole");
      setRole("");
      return;
    }
    window.localStorage.setItem("classShelfRole", nextRole);
    setRole(nextRole);
  }

  return (
    <div className="min-h-screen">
      <Navbar
        role={role}
        onLogout={function () {
          return handleRoleChange("");
        }}
      />

      <main className="p-4">
        <Routes>
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route
            path="/library"
            element={
              role === "teacher" ? (
                <Navigate to="/teacher" replace />
              ) : role === "student" ? (
                <Navigate to="/student" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/register"
            element={<Register onRegister={handleRoleChange} />}
          />
          <Route path="/login" element={<Login onLogin={handleRoleChange} />} />

          <Route
            path="/student"
            element={role === "student" ? <Student /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/teacher"
            element={role === "teacher" ? <Teacher /> : <Navigate to="/login" replace />}
          />

          <Route path="*" element={<div>404 bestie, page not found</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
