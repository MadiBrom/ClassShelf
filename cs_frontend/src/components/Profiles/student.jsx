import Library from "../library.jsx";

function Student({ user }) {
  return <Library initialRole="student" user={user} />;
}

export default Student;
