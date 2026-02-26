export default function BookBagPanel({
  isTeacher,
  isStudent,
  students,
  activeStudentId,
  setActiveStudentId,
  studentCheckouts,
  catalog,
  maxBag,
  onReturnRequest,
}) {
  return (
    <section className="panel">
      <h2>{isTeacher ? "Student" : "My Book Bag"}</h2>

      {isTeacher && !students.length && (
        <div className="empty">
          No students yet. Share your class code with students so they can join your class.
        </div>
      )}

      {isTeacher && students.length > 0 && !activeStudentId && (
        <div className="empty">Pick a student from the dropdown to view their bag and requests.</div>
      )}

      {isStudent && !activeStudentId && <div className="empty">Loading your book bag...</div>}

      {activeStudentId && (
        <>
          {isTeacher && (
            <div className="library__controls">
              <label className="control">
                View student
                <select
                  value={activeStudentId || ""}
                  onChange={(event) => setActiveStudentId(Number(event.target.value))}
                  disabled={!students.length}
                >
                  {!students.length && <option value="">No students yet</option>}
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <h3>
            Book Bag ({studentCheckouts.length}/{maxBag})
          </h3>
          <div className="grid">
            {studentCheckouts.map((checkout) => {
              const book = catalog.find((item) => item.id === checkout.bookId);
              return (
                <article key={checkout.id} className="card">
                  <div className="card__body">
                    <h3>{book?.title}</h3>
                    <p>{(book?.authors || []).join(", ")}</p>
                    {isStudent && (
                      <div className="card__actions">
                        <button
                          type="button"
                          onClick={(event) => onReturnRequest(event, checkout.id)}
                          disabled={checkout.returnRequested}
                        >
                          {checkout.returnRequested ? "Waiting for teacher" : "Request return"}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
            {!studentCheckouts.length && <div className="empty">No books checked out.</div>}
          </div>
        </>
      )}
    </section>
  );
}
