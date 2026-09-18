# Technical Notes

A session-scoped notes app using Node.js, Express, MongoDB, `express-session`, and `cookie-parser`.

## Run locally

1. Make sure MongoDB is running locally, or set `MONGO_URI` to a MongoDB connection string.
2. Install dependencies:

	```bash
	npm install
	```

3. Copy `.env.example` to `.env` and set a strong `SESSION_SECRET`.
4. Start the app:

	```bash
	npm start
	```

Open `http://localhost:3000`. Each browser session sees only the notes created with its own session cookie.

The API provides `GET /notes`, `POST /notes`, and `DELETE /notes/:id`.