const path = require('path');
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'technical_notes';

const mongoClient = new MongoClient(MONGO_URI);

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'replace-this-development-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGO_URI,
    dbName: DB_NAME,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60
  }),
  cookie: {
    maxAge: 14 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  req.session.initialized = true;
  next();
});

function notesCollection(req) {
  return req.app.locals.db.collection('notes');
}

app.get('/notes', async (req, res) => {
  try {
    const notes = await notesCollection(req)
      .find({ sessionId: req.sessionID })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(notes.map((note) => ({
      id: note._id.toString(),
      title: note.title,
      description: note.description,
      createdAt: note.createdAt
    })));
  } catch (error) {
    console.error('Could not load notes:', error);
    res.status(500).json({ error: 'Could not load notes.' });
  }
});

app.post('/notes', async (req, res) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  try {
    const note = {
      title: title.slice(0, 120),
      description: description.slice(0, 5000),
      sessionId: req.sessionID,
      createdAt: new Date()
    };
    const result = await notesCollection(req).insertOne(note);

    res.status(201).json({
      id: result.insertedId.toString(),
      title: note.title,
      description: note.description,
      createdAt: note.createdAt
    });
  } catch (error) {
    console.error('Could not save note:', error);
    res.status(500).json({ error: 'Could not save note.' });
  }
});

app.delete('/notes/:id', async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid note id.' });
  }

  try {
    const result = await notesCollection(req).deleteOne({
      _id: new ObjectId(req.params.id),
      sessionId: req.sessionID
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Note not found.' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Could not delete note:', error);
    res.status(500).json({ error: 'Could not delete note.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  await mongoClient.connect();
  app.locals.db = mongoClient.db(DB_NAME);
  await app.locals.db.collection('notes').createIndex({ sessionId: 1, createdAt: -1 });

  app.listen(PORT, () => {
    console.log(`Technical Notes is running at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Could not start the server:', error);
  process.exit(1);
});

async function closeMongoConnection() {
  await mongoClient.close();
}

process.on('SIGINT', closeMongoConnection);
process.on('SIGTERM', closeMongoConnection);