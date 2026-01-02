const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const app = express();
const cors = require('cors')
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

app.use(express.json());
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options(/.*/, cors());



app.get('/', (req, res) => {
  res.send('Backend is running!');
});

function formatBook(book) {
  return {
    id: book.id,
    googleId: book.googleId,
    title: book.title,
    authors: book.authors || [],
    isbn: book.isbn,
    coverUrl: book.coverUrl,
    description: book.description,
    tags: {
      genre: book.genre || '',
      readingLevel: book.readingLevel || '',
      interest: book.interest || '',
    },
    source: book.source || '',
  };
}

function formatCheckout(checkout) {
  return {
    id: checkout.id,
    bookId: checkout.bookId,
    studentId: checkout.studentId,
    status: checkout.status,
    returnRequested: checkout.returnRequested,
    returnNotes: checkout.returnNotes || '',
  };
}

async function loadLibraryData(teacherId) {
  const books = await prisma.book.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'asc' },
  });
  const shelfEntries = await prisma.shelfEntry.findMany({
    where: { teacherId },
  });
  const students = await prisma.student.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'asc' },
  });
  const bookIds = books.map(function (book) {
    return book.id;
  });
  const requests = bookIds.length
    ? await prisma.request.findMany({
        where: { bookId: { in: bookIds } },
        orderBy: { createdAt: 'asc' },
      })
    : [];
  const checkouts = bookIds.length
    ? await prisma.checkout.findMany({
        where: { bookId: { in: bookIds } },
        orderBy: { checkoutDate: 'desc' },
      })
    : [];

  return {
    catalog: books.map(formatBook),
    shelf: shelfEntries.map(function (entry) {
      return { bookId: entry.bookId, total: entry.total, available: entry.available };
    }),
    students: students.map(function (student) {
      return { id: student.id, name: student.name, email: student.email || '' };
    }),
    requests: requests.map(function (request) {
      return {
        id: request.id,
        bookId: request.bookId,
        studentId: request.studentId,
        status: request.status,
      };
    }),
    checkouts: checkouts.map(formatCheckout),
  };
}

app.get('/api/library', async (req, res) => {
  const teacherId = Number(req.query.teacherId);
  if (!teacherId) {
    res.status(400).json({ error: 'teacherId is required.' });
    return;
  }

  try {
    const payload = await loadLibraryData(teacherId);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: 'Unable to load library data.' });
  }
});

app.post('/api/register', async (req, res) => {
  const { role, name, email, password, teacherId: rawTeacherId } = req.body || {};
  if (!role || !name || !email || !password) {
    res.status(400).json({ error: 'Role, name, email, and password are required.' });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    if (role === 'teacher') {
      const teacher = await prisma.teacher.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });
      res.json({ id: teacher.id, role: 'teacher', name: teacher.name, email: teacher.email });
      return;
    }

    if (role === 'student') {
      let teacherId = Number(rawTeacherId);
      if (!teacherId) {
        const teacher = await prisma.teacher.findFirst({
          orderBy: { createdAt: 'asc' },
        });
        if (!teacher) {
          res.status(400).json({ error: 'Create a teacher account first.' });
          return;
        }
        teacherId = teacher.id;
      }

      const student = await prisma.student.create({
        data: {
          name,
          email,
          password: hashedPassword,
          teacherId,
        },
      });
      res.json({
        id: student.id,
        role: 'student',
        name: student.name,
        email: student.email || '',
        teacherId: student.teacherId,
      });
      return;
    }

    res.status(400).json({ error: 'Unknown role.' });
  } catch (error) {
    res.status(500).json({ error: 'Unable to register user.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const teacher = await prisma.teacher.findUnique({ where: { email } });
    if (teacher) {
      const valid = await bcrypt.compare(password, teacher.password);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });
      return res.json({ id: teacher.id, role: 'teacher', name: teacher.name, email: teacher.email });
    }

    const student = await prisma.student.findUnique({ where: { email } });
    if (student) {
      const valid = await bcrypt.compare(password, student.password);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });
      return res.json({ id: student.id, role: 'student', name: student.name, email: student.email || '', teacherId: student.teacherId });
    }

    return res.status(404).json({ error: 'User not found.' });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ error: 'Unable to log in.' });
  }
});


app.post('/api/books', async (req, res) => {
  const {
    teacherId,
    title,
    authors,
    isbn,
    coverUrl,
    description,
    tags,
    source,
    googleId,
  } = req.body || {};

  if (!teacherId || !title) {
    res.status(400).json({ error: 'teacherId and title are required.' });
    return;
  }

  try {
    const book = await prisma.book.create({
      data: {
        teacherId: Number(teacherId),
        title,
        authors: Array.isArray(authors) ? authors : [],
        isbn: isbn || null,
        coverUrl: coverUrl || null,
        description: description || null,
        googleId: googleId || null,
        source: source || null,
        genre: tags?.genre || null,
        readingLevel: tags?.readingLevel || null,
        interest: tags?.interest || null,
      },
    });
    res.json(formatBook(book));
  } catch (error) {
    res.status(500).json({ error: 'Unable to save book.' });
  }
});

app.post('/api/shelf', async (req, res) => {
  const { teacherId, bookId, delta } = req.body || {};
  const numericDelta = Number(delta);
  if (!teacherId || !bookId || Number.isNaN(numericDelta)) {
    res.status(400).json({ error: 'teacherId, bookId, and delta are required.' });
    return;
  }

  try {
    const existing = await prisma.shelfEntry.findUnique({
      where: { teacherId_bookId: { teacherId: Number(teacherId), bookId: Number(bookId) } },
    });

    if (!existing) {
      if (numericDelta <= 0) {
        res.status(400).json({ error: 'Copies must be at least 1.' });
        return;
      }
      const created = await prisma.shelfEntry.create({
        data: {
          teacherId: Number(teacherId),
          bookId: Number(bookId),
          total: numericDelta,
          available: numericDelta,
        },
      });
      res.json({ bookId: created.bookId, total: created.total, available: created.available });
      return;
    }

    const checkedOut = existing.total - existing.available;
    const nextTotal = existing.total + numericDelta;
    if (nextTotal < checkedOut) {
      res.status(400).json({ error: 'Cannot reduce copies below checked out.' });
      return;
    }

    const updated = await prisma.shelfEntry.update({
      where: { id: existing.id },
      data: {
        total: nextTotal,
        available: existing.available + numericDelta,
      },
    });
    res.json({ bookId: updated.bookId, total: updated.total, available: updated.available });
  } catch (error) {
    res.status(500).json({ error: 'Unable to update shelf.' });
  }
});

app.post('/api/requests', async (req, res) => {
  const { bookId, studentId } = req.body || {};
  if (!bookId || !studentId) {
    res.status(400).json({ error: 'bookId and studentId are required.' });
    return;
  }

  try {
    const request = await prisma.request.create({
      data: {
        bookId: Number(bookId),
        studentId: Number(studentId),
        status: 'pending',
      },
    });
    res.json({
      id: request.id,
      bookId: request.bookId,
      studentId: request.studentId,
      status: request.status,
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to create request.' });
  }
});

app.post('/api/requests/:id/approve', async (req, res) => {
  const requestId = Number(req.params.id);
  if (!requestId) {
    res.status(400).json({ error: 'Request id is required.' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id: requestId },
      });
      if (!request) {
        return { error: 'Request not found.' };
      }

      const book = await tx.book.findUnique({
        where: { id: request.bookId },
      });
      if (!book) {
        return { error: 'Book not found.' };
      }

      const entry = await tx.shelfEntry.findUnique({
        where: { teacherId_bookId: { teacherId: book.teacherId, bookId: request.bookId } },
      });
      if (!entry || entry.available <= 0) {
        return { error: 'No available copies.' };
      }

      await tx.shelfEntry.update({
        where: { id: entry.id },
        data: { available: entry.available - 1 },
      });

      const checkout = await tx.checkout.create({
        data: {
          bookId: request.bookId,
          studentId: request.studentId,
          status: 'checked_out',
          returnRequested: false,
          returnNotes: '',
        },
      });

      const updatedRequest = await tx.request.update({
        where: { id: request.id },
        data: { status: 'approved' },
      });

      return { checkout, request: updatedRequest };
    });

    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json({ request: result.request, checkout: formatCheckout(result.checkout) });
  } catch (error) {
    res.status(500).json({ error: 'Unable to approve request.' });
  }
});

app.post('/api/requests/:id/deny', async (req, res) => {
  const requestId = Number(req.params.id);
  if (!requestId) {
    res.status(400).json({ error: 'Request id is required.' });
    return;
  }

  try {
    const request = await prisma.request.update({
      where: { id: requestId },
      data: { status: 'denied' },
    });
    res.json({
      id: request.id,
      bookId: request.bookId,
      studentId: request.studentId,
      status: request.status,
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to deny request.' });
  }
});

app.post('/api/checkouts/:id/request-return', async (req, res) => {
  const checkoutId = Number(req.params.id);
  if (!checkoutId) {
    res.status(400).json({ error: 'Checkout id is required.' });
    return;
  }

  try {
    const checkout = await prisma.checkout.update({
      where: { id: checkoutId },
      data: { returnRequested: true },
    });
    res.json(formatCheckout(checkout));
  } catch (error) {
    res.status(500).json({ error: 'Unable to request return.' });
  }
});

app.post('/api/checkouts/:id/return', async (req, res) => {
  const checkoutId = Number(req.params.id);
  const { returnNotes } = req.body || {};
  if (!checkoutId) {
    res.status(400).json({ error: 'Checkout id is required.' });
    return;
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const checkout = await tx.checkout.findUnique({
        where: { id: checkoutId },
      });
      if (!checkout) {
        return { error: 'Checkout not found.' };
      }

      const book = await tx.book.findUnique({
        where: { id: checkout.bookId },
      });
      const entry = book
        ? await tx.shelfEntry.findUnique({
            where: { teacherId_bookId: { teacherId: book.teacherId, bookId: checkout.bookId } },
          })
        : null;

      if (entry) {
        await tx.shelfEntry.update({
          where: { id: entry.id },
          data: { available: entry.available + 1 },
        });
      }

      const updated = await tx.checkout.update({
        where: { id: checkout.id },
        data: {
          status: 'returned',
          returnNotes: returnNotes || checkout.returnNotes || '',
          returnDate: new Date(),
        },
      });

      return { checkout: updated };
    });

    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(formatCheckout(result.checkout));
  } catch (error) {
    res.status(500).json({ error: 'Unable to return checkout.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
