export default function RequestsPanel({
  visibleRequests,
  catalog,
  students,
  onApproveRequest,
  onDenyRequest,
}) {
  return (
    <section className="panel">
      <h2>Requests</h2>
      <div className="stack">
        {visibleRequests.map((request) => {
          const book = catalog.find((item) => item.id === request.bookId);
          const student = students.find((item) => item.id === request.studentId);

          return (
            <div key={request.id} className="row">
              <span>
                {student?.name} {book?.title ? `• ${book.title}` : ""}
              </span>
              <span className={`status status--${request.status}`}>{request.status}</span>

              {request.status === "pending" && (
                <div className="row__actions">
                  <button type="button" onClick={(event) => onApproveRequest(event, request.id)}>
                    Approve
                  </button>
                  <button type="button" onClick={(event) => onDenyRequest(event, request.id)}>
                    Deny
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {!visibleRequests.length && <div className="empty">No requests.</div>}
      </div>
    </section>
  );
}
