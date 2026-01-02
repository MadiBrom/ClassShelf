import { useMemo, useRef, useState } from "react";
import { searchGoogleBooks } from "../api.js";

const initialCatalog = [
  {
    id: "cat-1",
    title: "Charlotte's Web",
    authors: ["E. B. White"],
    isbn: "9780061124952",
    coverUrl: "https://books.google.com/books/content?id=cat-1&printsec=frontcover&img=1&zoom=1",
    description: "A classic story of friendship, loyalty, and the power of words.",
    tags: { genre: "Classics", readingLevel: "3", interest: "Animals" },
    source: "google",
  },
  {
    id: "cat-2",
    title: "The Wild Robot",
    authors: ["Peter Brown"],
    isbn: "9780316381994",
    coverUrl: "https://books.google.com/books/content?id=cat-2&printsec=frontcover&img=1&zoom=1",
    description: "A robot learns to survive and belong on a wild island.",
    tags: { genre: "Adventure", readingLevel: "4", interest: "STEM" },
    source: "manual",
  },
];

const initialShelf = [
  { bookId: "cat-1", total: 3, available: 2 },
  { bookId: "cat-2", total: 2, available: 2 },
];

const initialStudents = [
  { id: "stu-1", name: "Avery Johnson" },
  { id: "stu-2", name: "Mateo Garcia" },
  { id: "stu-3", name: "Riley Chen" },
];

const initialRequests = [
  { id: "req-1", bookId: "cat-1", studentId: "stu-1", status: "pending" },
];

const initialCheckouts = [
  {
    id: "co-1",
    bookId: "cat-1",
    studentId: "stu-2",
    status: "checked_out",
    returnRequested: false,
    returnNotes: "",
  },
];

const MAX_BAG = 5;

export default function Library ({ initialRole = "teacher" }) {
  const [role, setRole] = useState(initialRole);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [shelf, setShelf] = useState(initialShelf);
  const [students] = useState(initialStudents);
  const [activeStudentId, setActiveStudentId] = useState(initialStudents[0].id);
  const [requests, setRequests] = useState(initialRequests);
  const [checkouts, setCheckouts] = useState(initialCheckouts);
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
  const idCounter = useRef(10);

  function createId(prefix) {
    idCounter.current += 1;
    return `${prefix}-${idCounter.current}`;
  }

  const activeStudent = useMemo(function () {
    return students.find(function (student) {
      return student.id === activeStudentId;
    });
  }, [students, activeStudentId]);

  const shelfItems = useMemo(function () {
    return shelf.map(function (entry) {
      const book = catalog.find(function (item) {
        return item.id === entry.bookId;
      });
      const checkedOut = entry.total - entry.available;
      return { ...entry, book, checkedOut };
    });
  }, [catalog, shelf]);

 
  const studentCheckouts = useMemo(function () {
    return activeCheckouts.filter(function (checkout) {
      return checkout.studentId === activeStudentId;
    });
  }, [activeCheckouts, activeStudentId]);
  
 const activeCheckouts = useMemo(function () {
    return checkouts.filter(function (checkout) {
      return checkout.status === "checked_out";
    });
  }, [checkouts]);

  const studentRequests = useMemo(function () {
    return requests.filter(function (request) {
      return request.studentId === activeStudentId;
    });
  }, [requests, activeStudentId]);

  function getShelfEntry(bookId) {
    return shelf.find(function (entry) {
      return entry.bookId === bookId;
    });
  }

  function updateShelf(bookId, updater) {
    setShelf(function (prev) {
      return prev.map(function (entry) {
        return entry.bookId === bookId ? updater(entry) : entry;
      });
    });
  }

  function findCatalogMatch(candidate) {
    if (!candidate) return null;
    return catalog.find(function (book) {
      if (book.isbn && candidate.isbn && book.isbn === candidate.isbn) {
        return true;
      }
      if (candidate.googleId && book.googleId === candidate.googleId) {
        return true;
      }
      return (
        book.title.toLowerCase() === candidate.title.toLowerCase() &&
        book.authors.join(",").toLowerCase() ===
          candidate.authors.join(",").toLowerCase()
      );
    });
  }

  async function handleSearch(event) {
    event.preventDefault();
    setFeedback("");
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const localResults = catalog.filter(function (book) {
      const target = `${book.title} ${book.authors.join(" ")} ${book.isbn || ""}`;
      return target.toLowerCase().includes(query.toLowerCase());
    });

    if (localResults.length) {
      setSearchResults(
        localResults.map(function (book) {
          return { ...book, source: "catalog" };
        })
      );
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
      googleResults.map(function (result) {
        return {
          id: result.googleId,
          googleId: result.googleId,
          title: result.title,
          authors: result.authors,
          isbn: result.isbn13,
          coverUrl: result.coverUrl,
          description: result.description,
          source: "google",
        };
      })
    );
    setSearchSource("google");
  }

  function addToShelf(bookId, count) {
    const copies = Number(count) || 1;
    if (copies <= 0) {
      setFeedback("Copies must be at least 1.");
      return;
    }
    const existing = getShelfEntry(bookId);
    if (existing) {
      updateShelf(bookId, function (entry) {
        return {
          ...entry,
          total: entry.total + copies,
          available: entry.available + copies,
        };
      });
    } else {
      setShelf(function (prev) {
        return [...prev, { bookId, total: copies, available: copies }];
      });
    }
    setFeedback("Added to your class shelf.");
  }

  function handleManualAdd(event) {
    event.preventDefault();
    if (!manualForm.title.trim()) {
      setFeedback("Title is required for manual entries.");
      return;
    }

  function handleAddFromSearch(book) {
    const match = findCatalogMatch(book);
    let catalogId = match?.id;

    if (!catalogId) {
      catalogId = createId("cat");
      setCatalog(function (prev) {
        return [
          ...prev,
          {
            id: catalogId,
            googleId: book.googleId,
            title: book.title,
            authors: book.authors,
            isbn: book.isbn,
            coverUrl: book.coverUrl,
            description: book.description,
            tags: { genre: "", readingLevel: "", interest: "" },
            source: book.source,
          },
        ];
      });
    }

    addToShelf(catalogId, copiesDraft[book.id] || 1);
  }

    const newBook = {
      id: createId("cat"),
      title: manualForm.title.trim(),
      authors: manualForm.authors
        ? manualForm.authors.split(",").map(function (value) {
            return value.trim();
          })
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

    setCatalog(function (prev) {
      return [...prev, newBook];
    });
    addToShelf(newBook.id, 1);
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
  }

  function handleRequest(bookId) {
    setFeedback("");
    if (studentCheckouts.length >= MAX_BAG) {
      setFeedback("Student already has 5 books. Return one before requesting more.");
      return;
    }

    const alreadyRequested = requests.some(function (request) {
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

    setRequests(function (prev) {
      return [
        ...prev,
        {
          id: createId("req"),
          bookId,
          studentId: activeStudentId,
          status: "pending",
        },
      ];
    });
  }

  function handleApproveRequest(requestId) {
    setFeedback("");
    const request = requests.find(function (item) {
      return item.id === requestId;
    });
    if (!request) return;

    const entry = getShelfEntry(request.bookId);
    if (!entry || entry.available <= 0) {
      setFeedback("No available copies. Add copies before approving.");
      return;
    }

    const studentBagCount = checkouts.filter(function (checkout) {
      return (
        checkout.studentId === request.studentId &&
        checkout.status === "checked_out"
      );
    }).length;
    if (studentBagCount >= MAX_BAG) {
      setFeedback("Student has reached the 5 book limit.");
      return;
    }

    updateShelf(request.bookId, function (item) {
      return {
        ...item,
        available: item.available - 1,
      };
    });

    setCheckouts(function (prev) {
      return [
        ...prev,
        {
          id: createId("co"),
          bookId: request.bookId,
          studentId: request.studentId,
          status: "checked_out",
          returnRequested: false,
          returnNotes: "",
        },
      ];
    });

    setRequests(function (prev) {
      return prev.map(function (item) {
        return item.id === requestId ? { ...item, status: "approved" } : item;
      });
    });
  }

  function handleDenyRequest(requestId) {
    setRequests(function (prev) {
      return prev.map(function (item) {
        return item.id === requestId ? { ...item, status: "denied" } : item;
      });
    });
  }

  function handleReturn(checkoutId) {
    const checkout = checkouts.find(function (item) {
      return item.id === checkoutId;
    });
    if (!checkout) return;

    updateShelf(checkout.bookId, function (item) {
      return {
        ...item,
        available: item.available + 1,
      };
    });

    setCheckouts(function (prev) {
      return prev.map(function (item) {
        return item.id === checkoutId
          ? {
              ...item,
              status: "returned",
              returnNotes: returnNotes[checkoutId] || item.returnNotes,
            }
          : item;
      });
    });
  }

  function handleReturnRequest(checkoutId) {
    setCheckouts(function (prev) {
      return prev.map(function (item) {
        return item.id === checkoutId ? { ...item, returnRequested: true } : item;
      });
    });
  }

  function adjustCopies(bookId, delta) {
    const entry = getShelfEntry(bookId);
    if (!entry) return;
    const checkedOut = entry.total - entry.available;
    if (delta < 0 && entry.total + delta < checkedOut) {
      setFeedback("Cannot reduce copies below the number checked out.");
      return;
    }
    updateShelf(bookId, function (item) {
      return {
        ...item,
        total: item.total + delta,
        available: item.available + (delta > 0 ? delta : Math.min(delta, 0)),
      };
    });
  }

  return (
    <div className="library">
      <header className="library__header">
        <div>
          <p className="eyebrow">ClassShelf MVP</p>
          <h1>Library</h1>
          <p className="subtle">
            Public catalog + class shelf + requests in one place.
          </p>
        </div>
        <div className="library__controls">
          <label className="control">
            Role
            <select
              value={role}
              onChange={function (event) {
                setRole(event.target.value);
              }}
            >
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </label>
          {role === "student" && (
            <label className="control">
              Student
              <select
                value={activeStudentId}
                onChange={function (event) {
                  setActiveStudentId(event.target.value);
                }}
              >
                {students.map(function (student) {
                  return (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  );
                })}
              </select>
            </label>
          )}
        </div>
      </header>

      {feedback && <div className="notice">{feedback}</div>}

      {role === "teacher" && (
        <section className="panel">
          <h2>Search + Add</h2>
          <form className="search" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder="Search by title, author, ISBN..."
              value={searchQuery}
              onChange={function (event) {
                setSearchQuery(event.target.value);
              }}
            />
            <button type="submit">Search</button>
          </form>
          <p className="subtle">
            Searching your catalog first, then Google Books if nothing matches.
          </p>

          <div className="grid">
            {searchResults.map(function (result) {
              return (
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
                    <p>{result.authors.join(", ")}</p>
                    <p className="subtle">
                      {result.isbn ? `ISBN ${result.isbn}` : "No ISBN listed"}
                    </p>
                    <p className="subtle">{result.description}</p>
                    <div className="card__meta">
                      <span className="tag">
                        {result.source === "catalog" ? "Catalog" : "Google"}
                      </span>
                    </div>
                    <div className="card__actions">
                      <input
                        type="number"
                        min="1"
                        value={copiesDraft[result.id] || 1}
                        onChange={function (event) {
                          setCopiesDraft(function (prev) {
                            return {
                              ...prev,
                              [result.id]: event.target.value,
                            };
                          });
                        }}
                      />
                      <button
                        type="button"
                        onClick={function () {
                          handleAddFromSearch(result);
                        }}
                      >
                        Add to shelf
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
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
                onChange={function (event) {
                  setManualForm(function (prev) {
                    return { ...prev, title: event.target.value };
                  });
                }}
              />
              <input
                type="text"
                placeholder="Authors (comma separated)"
                value={manualForm.authors}
                onChange={function (event) {
                  setManualForm(function (prev) {
                    return { ...prev, authors: event.target.value };
                  });
                }}
              />
              <input
                type="text"
                placeholder="ISBN"
                value={manualForm.isbn}
                onChange={function (event) {
                  setManualForm(function (prev) {
                    return { ...prev, isbn: event.target.value };
                  });
                }}
              />
              <input
                type="url"
                placeholder="Cover URL"
                value={manualForm.coverUrl}
                onChange={function (event) {
                  setManualForm(function (prev) {
                    return { ...prev, coverUrl: event.target.value };
                  });
                }}
              />
              <input
                type="text"
                placeholder="Genre"
                value={manualForm.genre}
                onChange={function (event) {
                  setManualForm(function (prev) {
                    return { ...prev, genre: event.target.value };
                  });
                }}
              />
              <input
                type="text"
                placeholder="Reading level"
                value={manualForm.readingLevel}
                onChange={function (event) {
                  setManualForm(function (prev) {
                    return {
                      ...prev,
                      readingLevel: event.target.value,
                    };
                  });
                }}
              />
              <input
                type="text"
                placeholder="Interest"
                value={manualForm.interest}
                onChange={function (event) {
                  setManualForm(function (prev) {
                    return { ...prev, interest: event.target.value };
                  });
                }}
              />
              <textarea
                placeholder="Description"
                value={manualForm.description}
                onChange={function (event) {
                  setManualForm(function (prev) {
                    return {
                      ...prev,
                      description: event.target.value,
                    };
                  });
                }}
              />
            </div>
            <button type="submit">Save to catalog + add 1 copy</button>
          </form>
        </section>
      )}

      <section className="panel">
        <h2>Class Shelf</h2>
        <div className="grid">
          {shelfItems.map(function (entry) {
            return (
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
                  <p>{entry.book?.authors?.join(", ")}</p>
                  <p className="subtle">
                    Total: {entry.total} | Available: {entry.available} | Checked out:{" "}
                    {entry.checkedOut}
                  </p>
                  {role === "teacher" ? (
                    <div className="card__actions">
                      <button
                        type="button"
                        onClick={function () {
                          adjustCopies(entry.bookId, 1);
                        }}
                      >
                        +1 copy
                      </button>
                      <button
                        type="button"
                        onClick={function () {
                          adjustCopies(entry.bookId, -1);
                        }}
                      >
                        -1 copy
                      </button>
                    </div>
                  ) : (
                    <div className="card__actions">
                      <button
                        type="button"
                        onClick={function () {
                          handleRequest(entry.bookId);
                        }}
                      >
                        {entry.available > 0 ? "Request checkout" : "Join waitlist"}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {role === "student" && (
        <section className="panel">
          <h2>My Book Bag ({studentCheckouts.length}/{MAX_BAG})</h2>
          <div className="grid">
            {studentCheckouts.map(function (checkout) {
              const book = catalog.find(function (item) {
                return item.id === checkout.bookId;
              });
              return (
                <article key={checkout.id} className="card">
                  <div className="card__body">
                    <h3>{book?.title}</h3>
                    <p>{book?.authors?.join(", ")}</p>
                    <p className="subtle">
                      Status: {checkout.returnRequested ? "Return requested" : "Checked out"}
                    </p>
                    <div className="card__actions">
                      <button
                        type="button"
                        onClick={function () {
                          handleReturnRequest(checkout.id);
                        }}
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

          <h3>My Requests</h3>
          <div className="stack">
            {studentRequests.map(function (request) {
              const book = catalog.find(function (item) {
                return item.id === request.bookId;
              });
              return (
                <div key={request.id} className="row">
                  <span>{book?.title}</span>
                  <span className={`status status--${request.status}`}>
                    {request.status}
                  </span>
                </div>
              );
            })}
            {!studentRequests.length && <div className="empty">No requests yet.</div>}
          </div>
        </section>
      )}

      {role === "teacher" && (
        <section className="panel">
          <h2>Requests</h2>
          <div className="stack">
            {requests.map(function (request) {
              const book = catalog.find(function (item) {
                return item.id === request.bookId;
              });
              const student = students.find(function (item) {
                return item.id === request.studentId;
              });
              return (
                <div key={request.id} className="row">
                  <span>
                    {student?.name} — {book?.title}
                  </span>
                  <span className={`status status--${request.status}`}>
                    {request.status}
                  </span>
                  {request.status === "pending" && (
                    <div className="row__actions">
                      <button
                        type="button"
                        onClick={function () {
                          handleApproveRequest(request.id);
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={function () {
                          handleDenyRequest(request.id);
                        }}
                      >
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

      {role === "teacher" && (
        <section className="panel">
          <h2>Active Checkouts</h2>
          <div className="stack">
            {activeCheckouts.map(function (checkout) {
              const book = catalog.find(function (item) {
                return item.id === checkout.bookId;
              });
              const student = students.find(function (item) {
                return item.id === checkout.studentId;
              });
              return (
                <div key={checkout.id} className="row row--stack">
                  <div>
                    <strong>{book?.title}</strong> — {student?.name}
                    {checkout.returnRequested && (
                      <span className="tag tag--alert">Return requested</span>
                    )}
                  </div>
                  <div className="row__actions">
                    <input
                      type="text"
                      placeholder="Condition note"
                      value={returnNotes[checkout.id] || ""}
                      onChange={function (event) {
                        setReturnNotes(function (prev) {
                          return {
                            ...prev,
                            [checkout.id]: event.target.value,
                          };
                        });
                      }}
                    />
                    <button
                      type="button"
                      onClick={function () {
                        handleReturn(checkout.id);
                      }}
                    >
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
    </div>
  );
};

Library;
