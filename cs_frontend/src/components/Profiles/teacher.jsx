//Sees a list of all students in the class and their books.
//Has a list of all the books in their own library.
//Has ways to add books to their library, assign books to students, and see what students have checked out what books.
import React from "react";
import Library from "../library.jsx";

const Teacher = () => {
  return <Library initialRole="teacher" />;
};

export default Teacher;
