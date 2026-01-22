const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const cors = require('cors')
const { makeShelfCode, generateUniqueShelfCode } = require("../utils/shelfCode.cjs");
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-prod";

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options(/.*/, cors());

const PUBLIC_PATHS = new Set(["/", "/api/login", "/api/register"]);

function buildTokenPayload(user) {
  const payload = { id: user.id, role: user.role };
  if (user.role === "student" && user.teacherId) {
    payload.teacherId = user.teacherId;
  }
  return payload;
}

function signToken(user) {
  return jwt.sign(buildTokenPayload(user), JWT_SECRET, { expiresIn: "7d" });
}

function authMiddleware(req, res, next) {
  if (req.method === "OPTIONS" || PUBLIC_PATHS.has(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401);
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401);
  }
}

app.use(authMiddleware);



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
        where: { bookId: { in: bookIds }, status: 'pending' },
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
 const { role, name, email, password, shelfCode } = req.body;

  try {
    if (role === "teacher") {
      const teacherShelfCode = await generateUniqueShelfCode(prisma);
      const hashedPassword = await bcrypt.hash(password, 10);

      const teacher = await prisma.teacher.create({
        data: {
          name,
          email,
          password: hashedPassword,
          shelfCode: teacherShelfCode,
        },
        select: { id: true, name: true, email: true, shelfCode: true },
      });

      const user = { role: "teacher", ...teacher };
      return res.json({ ...user, token: signToken(user) });
    }

    if (role === "student") {
      const normalizedShelfCode = String(shelfCode || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");

      const teacher = await prisma.teacher.findUnique({
        where: { shelfCode: normalizedShelfCode },
      });

      if (!teacher) {
        return res.status(400).json({ message: "Invalid shelf code" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const student = await prisma.student.create({
        data: {
          name,
          email,
          password: hashedPassword,
          teacherId: teacher.id,
        },
        select: { id: true, name: true, email: true },
      });

      const user = { role: "student", ...student, teacherId: teacher.id };
      return res.json({ ...user, token: signToken(user) });
    }

    return res.status(400).json({ message: "Invalid role" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
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
      const isHashed = typeof teacher.password === "string" && teacher.password.startsWith("$2");
      let valid = false;
      if (isHashed) {
        valid = await bcrypt.compare(password, teacher.password);
      } else {
        valid = password === teacher.password;
      }
      if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });
      if (!isHashed) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.teacher.update({
          where: { id: teacher.id },
          data: { password: hashedPassword },
        });
      }

      const user = {
        id: teacher.id,
        role: 'teacher',
        name: teacher.name,
        email: teacher.email,
        shelfCode: teacher.shelfCode,
      };
      return res.json({ ...user, token: signToken(user) });
    }

    const student = await prisma.student.findUnique({ where: { email } });
    if (student) {
      const isHashed = typeof student.password === "string" && student.password.startsWith("$2");
      let valid = false;
      if (isHashed) {
        valid = await bcrypt.compare(password, student.password);
      } else {
        valid = password === student.password;
      }
      if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });
      if (!isHashed) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.student.update({
          where: { id: student.id },
          data: { password: hashedPassword },
        });
      }

      const user = {
        id: student.id,
        role: 'student',
        name: student.name,
        email: student.email || '',
        teacherId: student.teacherId,
      };
      return res.json({ ...user, token: signToken(user) });
    }

    return res.status(404).json({ error: 'User not found.' });
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ error: 'Unable to log in.' });
  }
});

app.patch("/teachers/:teacherId/shelf-code", async (req, res) => {
  try {
    const teacherId = Number(req.params.teacherId);

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const newCode = await generateUniqueShelfCode(prisma, 6);

    const updated = await prisma.teacher.update({
      where: { id: teacherId },
      data: { shelfCode: newCode },
      select: { id: false, shelfCode: true },
    });

    return res.json({ shelfCode: updated.shelfCode });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Server error" });
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
    const pendingRequest = await prisma.request.findFirst({
      where: {
        bookId: Number(bookId),
        studentId: Number(studentId),
        status: 'pending',
      },
    });

    if (pendingRequest) {
      res.status(400).json({ error: 'Request already pending for this student.' });
      return;
    }

    const activeCheckout = await prisma.checkout.findFirst({
      where: {
        bookId: Number(bookId),
        studentId: Number(studentId),
        status: 'checked_out',
      },
    });

    if (activeCheckout) {
      res.status(400).json({ error: 'Student already has this book checked out.' });
      return;
    }

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

      const existingCheckout = await tx.checkout.findFirst({
        where: {
          bookId: request.bookId,
          studentId: request.studentId,
          status: 'checked_out',
        },
      });

      if (existingCheckout) {
        return { error: 'Student already has this book checked out.' };
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

      await tx.request.delete({
        where: { id: request.id },
      });

      const approvedRequest = {
        id: request.id,
        bookId: request.bookId,
        studentId: request.studentId,
        status: 'approved',
      };

      return { checkout, request: approvedRequest };
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
    const request = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }

    await prisma.request.delete({
      where: { id: requestId },
    });

    res.json({
      id: request.id,
      bookId: request.bookId,
      studentId: request.studentId,
      status: 'denied',
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
