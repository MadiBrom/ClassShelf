import Library from "../Library.jsx";

function Teacher({ user }) {
  return <Library initialRole="teacher" user={user} />;
}

export default Teacher;
