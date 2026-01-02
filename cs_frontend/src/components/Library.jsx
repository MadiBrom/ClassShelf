import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveRequest,
  createBook,
  createRequest,
  denyRequest,
  getLibraryData,
  requestReturn,
  returnCheckout,
  searchGoogleBooks,
  updateShelf,
  refreshShelfCode,
} from "../../../utils/api.js";

const MAX_BAG = 5;

export default function Library({ user }) {
  const isTeacher = user?.role === "teacher";

  const [catalog, setCatalog] = useState([]);
  const [shelf, setShelf] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [checkouts, setCheckouts] = useState([]);

  const [shelfCode, setShelfCode] = useState((user?.shelfCode || "").toUpperCase());
  const [isRefreshingCode, setIsRefreshingCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchSource, setSearchSource] = useState("catalog");
  const [copiesDraft, setCopiesDraft] = useState({});

  const [manualForm, setManualForm] = useState({
    title: "",
    authors: "",
    isbn: "",
    description: "",
    coverUrl: "",
    genre: "",
    readingLevel: "",
    interest: "",
  });

  const [returnNotes, setReturnNotes] = useState({});
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const teacherId = user ? (isTeacher ? user.id : user.teacherId) : null;

  useEffect(() => {
    setShelfCode((user?.shelfCode || "").toUpperCase());
  }, [user?.shelfCode]);

  const shelfCodePretty = useMemo(() => {
    const code = (shelfCode || "").trim().toUpperCase();
    if (!code) return "";
    if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
    return code;
  }, [shelfCode]);

  const reloadLibrary = useCallback(async () => {
    if (!teacherId) return;

    setIsLoading(true);
    setFeedback("");

    try {
      const data = await getLibraryData(teacherId);

      setCatalog(data.catalog || []);
      setShelf(data.shelf || []);
      setStudents(data.students || []);
      setRequests(data.requests || []);
      setCheckouts(data.checkouts || []);

      if (!isTeacher) {
        setActiveStudentId(user?.id ?? null);
      } else {
        setActiveStudentId((prev) => {
          if (prev) return prev;
          if (data.students && data.students.length) return data.students[0].id;
          return null;
        });
      }
    } catch (error) {
      setFeedback(error.message || "Unable to load library data.");
    } finally {
      setIsLoading(false);
    }
  }, [teacherId, isTeacher, user?.id]);

  useEffect(() => {
    reloadLibrary();
  }, [reloadLibrary]);

  const shelfItems = useMemo(() => {
    return shelf.map((entry) => {
      const book = catalog.find((item) => item.id === entry.bookId);
      const checkedOut = entry.total - entry.available;
      return { ...entry, book, checkedOut };
    });
  }, [catalog, shelf]);

  const activeCheckouts = useMemo(() => {
    return checkouts.filter((checkout) => checkout.status === "checked_out");
  }, [checkouts]);

  const studentCheckouts = useMemo(() => {
    return activeCheckouts.filter((checkout) => checkout.studentId === activeStudentId);
  }, [activeCheckouts, activeStudentId]);

  const studentRequests = useMemo(() => {
    return requests.filter((request) => request.studentId === activeStudentId);
  }, [requests, activeStudentId]);

  const activeStudent = useMemo(() => {
    return students.find((s) => s.id === activeStudentId) || null;
  }, [students, activeStudentId]);

  const getShelfEntry = (bookId) => shelf.find((entry) => entry.bookId === bookId);

  const findCatalogMatch = (candidate) => {
    if (!candidate) return null;

    return catalog.find((book) => {
      if (book.isbn && candidate.isbn && book.isbn === candidate.isbn) return true;
      if (candidate.googleId && book.googleId === candidate.googleId) return true;

      return (
        (book.title || "").toLowerCase() === (candidate.title || "").toLowerCase() &&
        (book.authors || []).join(",").toLowerCase() === (candidate.authors || []).join(",").toLowerCase()
      );
    });
  };

  const handleCopyCode = async () => {
    const code = (shelfCode || "").trim().toUpperCase();
    if (!code) return;

    try {
      if (!navigator?.clipboard?.writeText) {
        setFeedback("Copy is not available in this browser.");
        return;
      }
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      setFeedback(err?.message || "Could not copy the code.");
    }
  };

  const handleRefreshCode = async () => {
    if (!teacherId) return;

    setFeedback("");
    setIsRefreshingCode(true);

    try {
      const data = await refreshShelfCode(teacherId);
      setShelfCode((data?.shelfCode || "").toUpperCase());
      setFeedback("New class code generated.");
    } catch (err) {
      setFeedback(err?.message || "Could not generate a new code.");
    } finally {
      setIsRefreshingCode(false);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setFeedback("");

    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const localResults = catalog.filter((book) => {
      const target = `${book.title} ${(book.authors || []).join(" ")} ${book.isbn || ""}`;
      return target.toLowerCase().includes(query.toLowerCase());
    });

    if (localResults.length) {
      setSearchResults(localResults.map((book) => ({ ...book, source: "catalog" })));
      setSearchSource("catalog");
      return;
    }

    const googleResults = await searchGoogleBooks(query);
    if (!googleResults.length) {
      setFeedback("No matches found. Add it manually below.");
      setSearchResults([]);
      setSearchSource("google");
      return;
    }

    setSearchResults(
      googleResults.map((result) => ({
        id: result.googleId,
        googleId: result.googleId,
        title: result.title,
        authors: result.authors,
        isbn: result.isbn13,
        coverUrl: result.coverUrl,
        description: result.description,
        source: "google",
      }))
    );
    setSearchSource("google");
  };

  const addToShelf = async (bookId, count) => {
    if (!teacherId) return;

    const copies = Number(count) || 1;
    if (copies <= 0) {
      setFeedback("Copies must be at least 1.");
      return;
    }

    try {
      await updateShelf({ teacherId, bookId, delta: copies });
      await reloadLibrary();
      setFeedback("Added to your class shelf.");
    } catch (error) {
      setFeedback(error.message || "Unable to update shelf.");
    }
  };

  const handleManualAdd = async (event) => {
    event.preventDefault();
    if (!teacherId) return;

    if (!manualForm.title.trim()) {
      setFeedback("Title is required for manual entries.");
      return;
    }

    const newBook = {
      teacherId,
      title: manualForm.title.trim(),
      authors: manualForm.authors
        ? manualForm.authors.split(",").map((value) => value.trim())
        : ["Unknown"],
      isbn: manualForm.isbn.trim() || null,
      coverUrl: manualForm.coverUrl.trim() || null,
      description: manualForm.description.trim(),
      tags: {
        genre: manualForm.genre.trim(),
        readingLevel: manualForm.readingLevel.trim(),
        interest: manualForm.interest.trim(),
      },
      source: "manual",
    };

    try {
      const created = await createBook(newBook);
      await addToShelf(created.id, 1);

      setManualForm({
        title: "",
        authors: "",
        isbn: "",
        description: "",
        coverUrl: "",
        genre: "",
        readingLevel: "",
        interest: "",
      });
    } catch (error) {
      setFeedback(error.message || "Unable to save book.");
    }
  };

  const handleAddFromSearch = async (book) => {
    if (!teacherId) return;

    const match = findCatalogMatch(book);
    let catalogId = match?.id;

    try {
      if (!catalogId) {
        const created = await createBook({
          teacherId,
          googleId: book.googleId,
          title: book.title,
          authors: book.authors,
          isbn: book.isbn,
          coverUrl: book.coverUrl,
          description: book.description,
          tags: { genre: "", readingLevel: "", interest: "" },
          source: book.source,
        });
        catalogId = created.id;
      }

      await addToShelf(catalogId, copiesDraft[book.id] || 1);
    } catch (error) {
      setFeedback(error.message || "Unable to save book.");
    }
  };

  const handleRequest = async (event, bookId) => {
    event.preventDefault();
    setFeedback("");

    if (!activeStudentId) {
      setFeedback("No student is selected.");
      return;
    }

    if (studentCheckouts.length >= MAX_BAG) {
      setFeedback("Student already has 5 books. Return one before requesting more.");
      return;
    }

    const alreadyRequested = requests.some((request) => {
      return (
        request.bookId === bookId &&
        request.studentId === activeStudentId &&
        request.status === "pending"
      );
    });

    if (alreadyRequested) {
      setFeedback("Request already pending for this student.");
      return;
    }

    try {
      await createRequest({ bookId, studentId: activeStudentId });
      await reloadLibrary();
    } catch (error) {
      setFeedback(error.message || "Unable to create request.");
    }
  };

  const handleApproveRequest = async (event, requestId) => {
    event.preventDefault();
    setFeedback("");

    try {
      await approveRequest(requestId);
      await reloadLibrary();
    } catch (error) {
      setFeedback(error.message || "Unable to approve request.");
    }
  };

  const handleDenyRequest = async (event, requestId) => {
    event.preventDefault();

    try {
      await denyRequest(requestId);
      await reloadLibrary();
    } catch (error) {
      setFeedback(error.message || "Unable to deny request.");
    }
  };

  const handleReturn = async (event, checkoutId) => {
    event.preventDefault();

    try {
      await returnCheckout(checkoutId, returnNotes[checkoutId] || "");
      await reloadLibrary();
    } catch (error) {
      setFeedback(error.message || "Unable to mark returned.");
    }
  };

  const handleReturnRequest = async (event, checkoutId) => {
    event.preventDefault();

    try {
      await requestReturn(checkoutId);
      await reloadLibrary();
    } catch (error) {
      setFeedback(error.message || "Unable to request return.");
    }
  };

  const adjustCopies = async (bookId, delta) => {
    const entry = getShelfEntry(bookId);
    if (!entry) return;

    const checkedOut = entry.total - entry.available;
    if (delta < 0 && entry.total + delta < checkedOut) {
      setFeedback("Cannot reduce copies below the number checked out.");
      return;
    }

    try {
      await updateShelf({ teacherId, bookId, delta });
      await reloadLibrary();
    } catch (error) {
      setFeedback(error.message || "Unable to update copies.");
    }
  };

  return (
    <div className="library">
      <header className="library__header">
        <div>
          <h1>{isTeacher ? "Teacher Library" : "Student Library"}</h1>

          {isTeacher && (
            <div className="subtle">
              <div>
                Class code: <strong>{shelfCodePretty || "Not set yet"}</strong>
              </div>
              <div className="row__actions">
                <button type="button" onClick={handleCopyCode} disabled={!shelfCode}>
                  {copied ? "Copied" : "Copy"}
                </button>
                <button type="button" onClick={handleRefreshCode} disabled={isRefreshingCode}>
                  {isRefreshingCode ? "Generating..." : "Generate new code"}
                </button>
              </div>
            </div>
          )}
        </div>

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
      </header>

      {feedback && <div className="notice">{feedback}</div>}
      {isLoading && <div className="notice">Loading your library...</div>}

      {isTeacher && (
        <section className="panel">
          <h2>Search + Add</h2>

          <form className="search" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="Search by title, author, ISBN..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          <p className="subtle">Searching your catalog first, then Google Books if nothing matches.</p>

          <div className="grid">
            {searchResults.map((result) => (
              <article key={result.id} className="card">
                <div className="card__cover">
                  {result.coverUrl ? (
                    <img src={result.coverUrl} alt={result.title} />
                  ) : (
                    <div className="cover__placeholder">No cover</div>
                  )}
                </div>

                <div className="card__body">
                  <h3>{result.title}</h3>
                  <p>{(result.authors || []).join(", ")}</p>
                  <p className="subtle">{result.isbn ? `ISBN ${result.isbn}` : "No ISBN listed"}</p>
                  <p className="subtle">{result.description}</p>

                  <div className="card__meta">
                    <span className="tag">{result.source === "catalog" ? "Catalog" : "Google"}</span>
                  </div>

                  <div className="card__actions">
                    <input
                      type="number"
                      min="1"
                      value={copiesDraft[result.id] || 1}
                      onChange={(event) => {
                        setCopiesDraft((prev) => ({ ...prev, [result.id]: event.target.value }));
                      }}
                    />
                    <button type="button" onClick={() => handleAddFromSearch(result)}>
                      Add to shelf
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {!searchResults.length && (
              <div className="empty">
                {searchSource === "catalog"
                  ? "Search to find books in your catalog or Google Books."
                  : "No Google Books matches. Add it manually below."}
              </div>
            )}
          </div>

          <form className="manual" onSubmit={handleManualAdd}>
            <h3>Manual Entry</h3>
            <div className="manual__grid">
              <input
                type="text"
                placeholder="Title *"
                value={manualForm.title}
                onChange={(event) => setManualForm((prev) => ({ ...prev, title: event.target.value }))}
              />
              <input
                type="text"
                placeholder="Authors (comma separated)"
                value={manualForm.authors}
                onChange={(event) => setManualForm((prev) => ({ ...prev, authors: event.target.value }))}
              />
              <input
                type="text"
                placeholder="ISBN"
                value={manualForm.isbn}
                onChange={(event) => setManualForm((prev) => ({ ...prev, isbn: event.target.value }))}
              />
              <input
                type="url"
                placeholder="Cover URL"
                value={manualForm.coverUrl}
                onChange={(event) => setManualForm((prev) => ({ ...prev, coverUrl: event.target.value }))}
              />
              <input
                type="text"
                placeholder="Genre"
                value={manualForm.genre}
                onChange={(event) => setManualForm((prev) => ({ ...prev, genre: event.target.value }))}
              />
              <input
                type="text"
                placeholder="Reading level"
                value={manualForm.readingLevel}
                onChange={(event) =>
                  setManualForm((prev) => ({ ...prev, readingLevel: event.target.value }))
                }
              />
              <input
                type="text"
                placeholder="Interest"
                value={manualForm.interest}
                onChange={(event) =>
                  setManualForm((prev) => ({ ...prev, interest: event.target.value }))
                }
              />
              <textarea
                placeholder="Description"
                value={manualForm.description}
                onChange={(event) =>
                  setManualForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <button type="submit">Add & Save</button>
          </form>
        </section>
      )}

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
                    <button type="button" onClick={() => adjustCopies(entry.bookId, 1)}>
                      +
                    </button>
                    <button type="button" onClick={() => adjustCopies(entry.bookId, -1)}>
                      -
                    </button>
                  </div>
                ) : (
                  <div className="card__actions">
                    <button type="button" onClick={(event) => handleRequest(event, entry.bookId)}>
                      {entry.available > 0 ? "Request checkout" : "Join waitlist"}
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {!isTeacher && (
        <section className="panel">
          <h2>
            My Book Bag ({studentCheckouts.length}/{MAX_BAG})
          </h2>

          <div className="grid">
            {studentCheckouts.map((checkout) => {
              const book = catalog.find((item) => item.id === checkout.bookId);

              return (
                <article key={checkout.id} className="card">
                  <div className="card__body">
                    <h3>{book?.title}</h3>
                    <p>{(book?.authors || []).join(", ")}</p>
                    <p className="subtle">
                      Status: {checkout.returnRequested ? "Return requested" : "Checked out"}
                    </p>
                    <div className="card__actions">
                      <button
                        type="button"
                        onClick={(event) => handleReturnRequest(event, checkout.id)}
                        disabled={checkout.returnRequested}
                      >
                        Request return
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            {!studentCheckouts.length && <div className="empty">No books checked out.</div>}
          </div>
        </section>
      )}

      {isTeacher && (
        <section className="panel">
          <h2>Requests</h2>
          <div className="stack">
            {requests.map((request) => {
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
                      <button type="button" onClick={(event) => handleApproveRequest(event, request.id)}>
                        Approve
                      </button>
                      <button type="button" onClick={(event) => handleDenyRequest(event, request.id)}>
                        Deny
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {!requests.length && <div className="empty">No requests.</div>}
          </div>
        </section>
      )}

      {isTeacher && (
        <section className="panel">
          <h2>Active Checkouts</h2>
          <div className="stack">
            {activeCheckouts.map((checkout) => {
              const book = catalog.find((item) => item.id === checkout.bookId);
              const student = students.find((item) => item.id === checkout.studentId);

              return (
                <div key={checkout.id} className="row row--stack">
                  <div>
                    <strong>{book?.title}</strong> {student?.name ? `• ${student.name}` : ""}
                    {checkout.returnRequested && <span className="tag tag--alert">Return requested</span>}
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
                    <button type="button" onClick={(event) => handleReturn(event, checkout.id)}>
                      Mark returned
                    </button>
                  </div>
                </div>
              );
            })}
            {!activeCheckouts.length && <div className="empty">No active checkouts.</div>}
          </div>
        </section>
      )}

      {isTeacher && (
        <section className="panel">
          <h2>Student</h2>

          {!students.length && (
            <div className="empty">
              No students yet. Share your class code with students so they can join your class.
            </div>
          )}

          {students.length > 0 && !activeStudentId && (
            <div className="empty">Pick a student from the dropdown to view their bag and requests.</div>
          )}

          {activeStudentId && (
            <>
              <p className="subtle">
                Viewing: <strong>{activeStudent?.name || "Student"}</strong>
              </p>

              <h3>
                Book Bag ({studentCheckouts.length}/{MAX_BAG})
              </h3>
              <div className="grid">
                {studentCheckouts.map((checkout) => {
                  const book = catalog.find((item) => item.id === checkout.bookId);
                  return (
                    <article key={checkout.id} className="card">
                      <div className="card__body">
                        <h3>{book?.title}</h3>
                        <p>{(book?.authors || []).join(", ")}</p>
                        <p className="subtle">
                          Status: {checkout.returnRequested ? "Return requested" : "Checked out"}
                        </p>
                      </div>
                    </article>
                  );
                })}
                {!studentCheckouts.length && <div className="empty">No books checked out.</div>}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
Library;