//Can see checkout books
//Return books back to the library
//can see the information about the books they have checked out
//Can see the information about the books their teacher has assigned to them

import React from "react";
import Library from "../library.jsx";

const Student = () => {
  return <Library initialRole="student" />;
};

export default Student;
