const mockGoogleBooks = [
  {
    googleId: "gb-1",
    title: "Charlotte's Web",
    authors: ["E. B. White"],
    isbn13: "9780061124952",
    coverUrl: "https://books.google.com/books/content?id=gb-1&printsec=frontcover&img=1&zoom=1",
    description: "A classic story of friendship, loyalty, and the power of words.",
  },
  {
    googleId: "gb-2",
    title: "Because of Winn-Dixie",
    authors: ["Kate DiCamillo"],
    isbn13: "9780763680862",
    coverUrl: "https://books.google.com/books/content?id=gb-2&printsec=frontcover&img=1&zoom=1",
    description: "A girl and a dog help a small town find its heart.",
  },
  {
    googleId: "gb-3",
    title: "The One and Only Ivan",
    authors: ["Katherine Applegate"],
    isbn13: "9780061992278",
    coverUrl: "https://books.google.com/books/content?id=gb-3&printsec=frontcover&img=1&zoom=1",
    description: "A gorilla tells his story of life in captivity and hope for freedom.",
  },
  {
    googleId: "gb-4",
    title: "The Wild Robot",
    authors: ["Peter Brown"],
    isbn13: "9780316381994",
    coverUrl: "https://books.google.com/books/content?id=gb-4&printsec=frontcover&img=1&zoom=1",
    description: "A robot learns to survive and belong on a wild island.",
  },
  {
    googleId: "gb-5",
    title: "Wonder",
    authors: ["R. J. Palacio"],
    isbn13: "9780375869020",
    coverUrl: "https://books.google.com/books/content?id=gb-5&printsec=frontcover&img=1&zoom=1",
    description: "A boy with facial differences navigates school and friendship.",
  },
];

function matchesQuery (value, query){
  value && value.toLowerCase().includes(query);
}
export async function searchGoogleBooks (rawQuery) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return [];
  }

  return mockGoogleBooks.filter(function (book) {
    return (
      matchesQuery(book.title, query) ||
      book.authors.some(function (author) {
        return matchesQuery(author, query);
      }) ||
      matchesQuery(book.isbn13, query)
    );
  });
};
