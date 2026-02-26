import Library from "../Library.jsx";

function Student({ user }) {
  return <Library initialRole="student" user={user} />;
}

export default Student;
