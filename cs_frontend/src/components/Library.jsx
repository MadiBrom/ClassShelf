import React from 'react'

const Library = () => {
  return (
    <div>
      {/* needs a search component that looks through google books api (the fetch calls will be in its own api.js file) */}
      {/* if book is not found in the database, teacher should be able to add it manually where the post call adds it into its own database (this database will not only be accessable by the teacher that added it but any teacher that has an account.) */}
      {/* All info will display with similar information to  what can be found in google books api*/}
      {/* If teacher finds the book in the database, then they can add it to their library (which also adds it to the public database the is specific for class shelf) they can also say how many they own in their class library (so is 3 students want the book and there are 3 of them each one can be checked out.*/}
      {/* The library with be accessable to both teachers and students  but is only editable by teachers. The students can checkout out request books in the library*/}
    </div>
  )
}

export default Library
