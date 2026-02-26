export default function ReturnsPanel({
  activeCheckouts,
  catalog,
  students,
  returnNotes,
  setReturnNotes,
  onReturn,
}) {
  return (
    <section className="panel">
      <h2>Returns</h2>
      <div className="stack">
        {activeCheckouts
          .filter((checkout) => checkout.returnRequested)
          .map((checkout) => {
            const book = catalog.find((item) => item.id === checkout.bookId);
            const student = students.find((item) => item.id === checkout.studentId);

            return (
              <div key={checkout.id} className="row row--stack">
                <div>
                  <strong>{book?.title}</strong> {student?.name ? `• ${student.name}` : ""}
                  <span className="tag tag--alert">Return requested</span>
                </div>
                <div className="row__actions">
                  <input
                    type="text"
                    placeholder="Condition note"
                    value={returnNotes[checkout.id] || ""}
                    onChange={(event) => {
                      setReturnNotes((prev) => ({ ...prev, [checkout.id]: event.target.value }));
                    }}
                  />
                  <button type="button" onClick={(event) => onReturn(event, checkout.id)}>
                    Mark returned
                  </button>
                </div>
              </div>
            );
          })}
        {!activeCheckouts.some((checkout) => checkout.returnRequested) && (
          <div className="empty">No return requests yet.</div>
        )}
      </div>
    </section>
  );
}
