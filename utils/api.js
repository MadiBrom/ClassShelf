const OPEN_LIBRARY_SEARCH_URL = "https://openlibrary.org/search.json";
const OPEN_LIBRARY_FIELDS = [
  "key",
  "title",
  "author_name",
  "cover_i",
  "first_sentence",
].join(",");
const API_URL = import.meta.env.VITE_DATABASE_URL || "http://localhost:3000";

function getFirstSentence(raw) {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && typeof raw.value === "string") return raw.value;
  return "";
}

function coverUrlFromDoc(doc) {
  if (doc?.cover_i) {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
  }
  return "";
}

function mapOpenLibraryDoc(doc) {
  return {
    googleId: doc?.key || null,
    title: doc?.title || "",
    authors: Array.isArray(doc?.author_name) ? doc.author_name : [],
    coverUrl: coverUrlFromDoc(doc),
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

function getStoredUser() {
  try {
    const stored = window.localStorage.getItem("classShelfUser");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
}

function getAuthToken() {
  return getStoredUser()?.token || null;
}

async function apiRequest(path, options) {
  const headers = { "Content-Type": "application/json", ...(options?.headers || {}) };
  const token = getAuthToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(function () {
      return null;
    });
    if (response.status === 401) {
      window.localStorage.removeItem("classShelfUser");
    }
    const message = payload?.error || payload?.message || "Request failed.";
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

export const refreshShelfCode = async (teacherId) => {
  return apiRequest(`/teachers/${teacherId}/shelf-code`, {
    method: "PATCH",
  });
};

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
