// brainstem.js - Express server for centralizing Giphy API + Guestbook Log
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const leoProfanity = require("leo-profanity");
leoProfanity.loadDictionary(); // Load default dictionary


const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = "9y2mJqxYAf6rYufW6hJpFXGA0QkwXe05";
const CACHE_SIZE = 10;
const GIF_REFRESH_INTERVAL = 60000; // 60 seconds per new GIF
const LOG_PATH = "./messages.json";

app.use(cors());
app.use(express.json()); // Needed for JSON POST parsing

let gifCache = [];
let lastFetch = 0;

// 🌐 ROUTES

// Root
app.get("/", (req, res) => {
  res.send("🧠 Brainstem online and twitching.");
});

// Fetch a new GIF from Giphy and add to cache
async function fetchGif() {
  try {
    const response = await fetch(`https://api.giphy.com/v1/gifs/random?api_key=${API_KEY}&rating=pg-13`);
    const data = await response.json();
    if (data?.data?.images?.original?.url) {
      gifCache.push(data.data.images.original.url);
      if (gifCache.length > CACHE_SIZE) gifCache.shift();
      lastFetch = Date.now();
    }
  } catch (err) {
    console.error("Error fetching gif:", err);
  }
}

// Start periodic fetch
setInterval(fetchGif, GIF_REFRESH_INTERVAL);
fetchGif(); // Initial boot fetch

// GET one random GIF
app.get("/api/random-gif", (req, res) => {
  if (gifCache.length === 0) {
    return res.status(503).json({ error: "No GIFs yet." });
  }
  const randomIndex = Math.floor(Math.random() * gifCache.length);
  res.json({ url: gifCache[randomIndex] });
});

// GET all cached GIFs
app.get("/api/gif-cache", (req, res) => {
  res.json({ gifs: gifCache });
});

// 📜 GUESTBOOK LOG ENDPOINTS

// GET /api/log → return latest 50 messages
app.get("/api/log", (req, res) => {
  fs.readFile(LOG_PATH, (err, data) => {
    if (err) return res.status(500).json({ error: "Logbook unavailable." });
    const messages = JSON.parse(data || "[]").slice(-50).reverse();
    res.json(messages);
  });
});

// POST /api/log → submit a new message
app.post("/api/log", (req, res) => {
  const message = req.body.message;
  if (!message || typeof message !== "string" || message.length > 200) {
    return res.status(400).json({ error: "Invalid message." });
  }

  const cleaned = leoProfanity.clean(message);

  const entry = {
    text: cleaned,
    timestamp: new Date().toISOString(),
    ip: req.ip
  };

  fs.readFile(LOG_PATH, (err, data) => {
    const messages = err ? [] : JSON.parse(data || "[]");
    messages.push(entry);
    fs.writeFile(LOG_PATH, JSON.stringify(messages.slice(-100)), () => {
      res.json({ success: true });
    });
  });
});

// Boot server
app.listen(PORT, () => {
  console.log(`🧠 Brainstem online at http://localhost:${PORT}`);
});
