export default function ShelfPanel({
  shelfItems,
  isTeacher,
  requests,
  activeStudentId,
  studentCheckouts,
  onAdjustCopies,
  onRequest,
}) {
  return (
    <section className="panel">
      <h2>Class Shelf</h2>
      <div className="grid">
        {shelfItems.map((entry) => (
          <article key={entry.bookId} className="card">
            <div className="card__cover">
              {entry.book?.coverUrl ? (
                <img src={entry.book.coverUrl} alt={entry.book.title} />
              ) : (
                <div className="cover__placeholder">No cover</div>
              )}
            </div>
            <div className="card__body">
              <h3>{entry.book?.title || "Unknown book"}</h3>
              <p>{(entry.book?.authors || []).join(", ")}</p>
              <p className="subtle">
                Total: {entry.total} | Available: {entry.available} | Checked out: {entry.checkedOut}
              </p>

              {isTeacher ? (
                <div className="card__actions">
                  <button type="button" onClick={() => onAdjustCopies(entry.bookId, 1)}>
                    +
                  </button>
                  <button type="button" onClick={() => onAdjustCopies(entry.bookId, -1)}>
                    -
                  </button>
                </div>
              ) : (
                <div className="card__actions">
                  {(() => {
                    const alreadyRequested = requests.some(
                      (request) =>
                        request.bookId === entry.bookId &&
                        request.studentId === activeStudentId &&
                        request.status === "pending"
                    );
                    const alreadyCheckedOut = studentCheckouts.some(
                      (checkout) => checkout.bookId === entry.bookId
                    );
                    const label = alreadyCheckedOut
                      ? "Already checked out"
                      : alreadyRequested
                      ? "Requested"
                      : entry.available > 0
                      ? "Request checkout"
                      : "Join waitlist";

                    return (
                      <button
                        type="button"
                        onClick={(event) => onRequest(event, entry.bookId)}
                        disabled={alreadyRequested || alreadyCheckedOut}
                      >
                        {label}
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
