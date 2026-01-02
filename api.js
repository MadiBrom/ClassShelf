const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_FIELDS = [
  "key",
  "title",
  "author_name",
  "isbn",
  "cover_i",
  "first_sentence",
].join(",");

function pickIsbn13(isbnList) {
  if (!Array.isArray(isbnList)) return null;
  const normalized = isbnList
    .map(function (value) {
      return String(value || "").replace(/[^0-9X]/gi, "");
    })
    .filter(Boolean);

  const isbn13 = normalized.find(function (value) {
    return value.length === 13 && /^\\d+$/.test(value);
  });

  return isbn13 || null;
}

function getFirstSentence(raw) {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && typeof raw.value === "string") return raw.value;
  return "";
}

function coverUrlFromDoc(doc, isbn13) {
  if (doc?.cover_i) {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
  }
  if (isbn13) {
    return `https://covers.openlibrary.org/b/isbn/${isbn13}-M.jpg`;
  }
  return "";
}

function mapOpenLibraryDoc(doc) {
  const isbn13 = pickIsbn13(doc?.isbn);
  return {
    googleId: doc?.key || null,
    title: doc?.title || "",
    authors: Array.isArray(doc?.author_name) ? doc.author_name : [],
    isbn13,
    coverUrl: coverUrlFromDoc(doc, isbn13),
    description: getFirstSentence(doc?.first_sentence),
  };
}

export async function searchGoogleBooks(rawQuery) {
  const query = rawQuery.trim();
  if (!query) return [];

  const url = `${OPEN_LIBRARY_SEARCH_URL}?q=${encodeURIComponent(
    query
  )}&limit=12&fields=${encodeURIComponent(OPEN_LIBRARY_FIELDS)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Open Library search failed.");
  }

  const payload = await response.json();
  const docs = Array.isArray(payload?.docs) ? payload.docs : [];
  return docs.map(mapOpenLibraryDoc).filter(function (book) {
    return book.title;
  });
}

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

async function apiRequest(path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(function () {
      return null;
    });
    const message = payload?.error || "Request failed.";
    throw new Error(message);
  }

  return response.json();
}

export async function registerUser (payload) {
  return apiRequest("/api/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser (payload) {
  return apiRequest("/api/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getLibraryData (teacherId) {
  return apiRequest(`/api/library?teacherId=${teacherId}`);
}

export async function createBook (payload) {
  return apiRequest("/api/books", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateShelf (payload) {
  return apiRequest("/api/shelf", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createRequest (payload) {
  return apiRequest("/api/requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function approveRequest (requestId) {
  return apiRequest(`/api/requests/${requestId}/approve`, {
    method: "POST",
  });
}

export async function denyRequest (requestId) {
  return apiRequest(`/api/requests/${requestId}/deny`, {
    method: "POST",
  });
}

export async function requestReturn (checkoutId) {
  return apiRequest(`/api/checkouts/${checkoutId}/request-return`, {
    method: "POST",
  });
}

export async function returnCheckout (checkoutId, returnNotes) {
  return apiRequest(`/api/checkouts/${checkoutId}/return`, {
    method: "POST",
    body: JSON.stringify({ returnNotes }),
  });
}
