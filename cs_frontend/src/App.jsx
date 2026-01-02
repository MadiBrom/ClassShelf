import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/nav.jsx";
import Register from "./components/register.jsx";
import Login from "./components/login.jsx";
import Student from "./components/Profiles/student.jsx";
import Teacher from "./components/Profiles/teacher.jsx";

function App() {
  const [user, setUser] = useState(function () {
    const stored = window.localStorage.getItem("classShelfUser");
    if (!stored) {
      return null;
    }
    try {
      return JSON.parse(stored);
    } catch (error) {
      window.localStorage.removeItem("classShelfUser");
      return null;
    }
  });

  function handleUserChange(nextUser) {
    if (!nextUser) {
      window.localStorage.removeItem("classShelfUser");
      setUser(null);
      return;
    }
    window.localStorage.setItem("classShelfUser", JSON.stringify(nextUser));
    setUser(nextUser);
  }

  return (
    <div className="min-h-screen">
      <Navbar
        role={user?.role || ""}
        onLogout={function () {
          return handleUserChange(null);
        }}
      />

      <main className="p-4">
        <Routes>
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route
            path="/library"
            element={
              user?.role === "teacher" ? (
                <Navigate to="/teacher" replace />
              ) : user?.role === "student" ? (
                <Navigate to="/student" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/register"
            element={<Register onRegister={handleUserChange} />}
          />
          <Route path="/login" element={<Login onLogin={handleUserChange} />} />

          <Route
            path="/student"
            element={
              user?.role === "student" ? (
                <Student user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/teacher"
            element={
              user?.role === "teacher" ? (
                <Teacher user={user} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route path="*" element={<div>404 bestie, page not found</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
