import { useCallback, useEffect, useMemo, useState } from "react";
import {
  approveRequest,
  createBook,
  createRequest,
  denyRequest,
  getLibraryData,
  refreshShelfCode,
  requestReturn,
  returnCheckout,
  searchGoogleBooks,
  updateShelf,
} from "../../../utils/api.js";
import BookBagPanel from "./library/BookBagPanel.jsx";
import LibraryHeader from "./library/LibraryHeader.jsx";
import RequestsPanel from "./library/RequestsPanel.jsx";
import ReturnsPanel from "./library/ReturnsPanel.jsx";
import SearchAddPanel from "./library/SearchAddPanel.jsx";
import ShelfPanel from "./library/ShelfPanel.jsx";

const MAX_BAG = 5;
const REQUEST_EXPIRY_MS = 5 * 60 * 1000;
const REQUEST_PRUNE_INTERVAL_MS = 30 * 1000;

export default function Library({ user }) {
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  const [catalog, setCatalog] = useState([]);
  const [shelf, setShelf] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [requestNow, setRequestNow] = useState(Date.now());

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
      setRequests((prev) => {
        const now = Date.now();
        const pending = (data.requests || []).map((request) => ({
          ...request,
          status: request.status || "pending",
        }));
        const pendingIds = new Set(pending.map((request) => request.id));
        const resolved = (prev || [])
          .filter((request) => request.status !== "pending")
          .map((request) => ({
            ...request,
            resolvedAt: request.resolvedAt || now,
          }))
          .filter((request) => now - request.resolvedAt < REQUEST_EXPIRY_MS)
          .filter((request) => !pendingIds.has(request.id));

        return [...pending, ...resolved];
      });
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

  useEffect(() => {
    if (!user) {
      setRequests([]);
    }
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRequestNow(Date.now());
    }, REQUEST_PRUNE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const visibleRequests = useMemo(() => {
    return (requests || []).filter((request) => {
      if (request.status === "pending") return true;
      const resolvedAt = request.resolvedAt || requestNow;
      return requestNow - resolvedAt < REQUEST_EXPIRY_MS;
    });
  }, [requestNow, requests]);

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

  const getShelfEntry = (bookId) => shelf.find((entry) => entry.bookId === bookId);

  const findCatalogMatch = (candidate) => {
    if (!candidate) return null;

    return catalog.find((book) => {
      if (candidate.googleId && book.googleId === candidate.googleId) return true;

      return (
        (book.title || "").toLowerCase() === (candidate.title || "").toLowerCase() &&
        (book.authors || []).join(",").toLowerCase() ===
          (candidate.authors || []).join(",").toLowerCase()
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
      const target = `${book.title} ${(book.authors || []).join(" ")}`;
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

    const alreadyCheckedOut = studentCheckouts.some((checkout) => checkout.bookId === bookId);
    if (alreadyCheckedOut) {
      setFeedback("Student already has this book checked out.");
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
      const result = await approveRequest(requestId);
      const requestStatus = result?.request?.status || "approved";

      const resolvedAt = Date.now();
      setRequests((prev) =>
        prev.map((request) =>
          request.id === requestId ? { ...request, status: requestStatus, resolvedAt } : request
        )
      );

      if (result?.checkout) {
        setCheckouts((prev) => [result.checkout, ...prev]);
        setShelf((prev) =>
          prev.map((entry) =>
            entry.bookId === result.checkout.bookId
              ? { ...entry, available: Math.max(0, entry.available - 1) }
              : entry
          )
        );
      }
      await reloadLibrary();
    } catch (error) {
      setFeedback(error.message || "Unable to approve request.");
    }
  };

  const handleDenyRequest = async (event, requestId) => {
    event.preventDefault();

    try {
      const result = await denyRequest(requestId);
      const requestStatus = result?.status || result?.request?.status || "denied";

      const resolvedAt = Date.now();
      setRequests((prev) =>
        prev.map((request) =>
          request.id === requestId ? { ...request, status: requestStatus, resolvedAt } : request
        )
      );
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
      <LibraryHeader
        isTeacher={isTeacher}
        shelfCodePretty={shelfCodePretty}
        shelfCode={shelfCode}
        copied={copied}
        isRefreshingCode={isRefreshingCode}
        onCopyCode={handleCopyCode}
        onRefreshCode={handleRefreshCode}
      />

      {feedback && <div className="notice">{feedback}</div>}
      {isLoading && <div className="notice">Loading your library...</div>}

      {isTeacher && (
        <SearchAddPanel
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          searchSource={searchSource}
          copiesDraft={copiesDraft}
          setCopiesDraft={setCopiesDraft}
          onSearch={handleSearch}
          onAddFromSearch={handleAddFromSearch}
          manualForm={manualForm}
          setManualForm={setManualForm}
          onManualAdd={handleManualAdd}
        />
      )}

      <ShelfPanel
        shelfItems={shelfItems}
        isTeacher={isTeacher}
        requests={requests}
        activeStudentId={activeStudentId}
        studentCheckouts={studentCheckouts}
        onAdjustCopies={adjustCopies}
        onRequest={handleRequest}
      />

      {isTeacher && (
        <RequestsPanel
          visibleRequests={visibleRequests}
          catalog={catalog}
          students={students}
          onApproveRequest={handleApproveRequest}
          onDenyRequest={handleDenyRequest}
        />
      )}

      {isTeacher && (
        <ReturnsPanel
          activeCheckouts={activeCheckouts}
          catalog={catalog}
          students={students}
          returnNotes={returnNotes}
          setReturnNotes={setReturnNotes}
          onReturn={handleReturn}
        />
      )}

      {(isTeacher || isStudent) && (
        <BookBagPanel
          isTeacher={isTeacher}
          isStudent={isStudent}
          students={students}
          activeStudentId={activeStudentId}
          setActiveStudentId={setActiveStudentId}
          studentCheckouts={studentCheckouts}
          catalog={catalog}
          maxBag={MAX_BAG}
          onReturnRequest={handleReturnRequest}
        />
      )}
    </div>
  );
}
