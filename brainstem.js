
// brainstem.js - Express server for centralizing Giphy API access
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const API_KEY = "9y2mJqxYAf6rYufW6hJpFXGA0QkwXe05";
const CACHE_SIZE = 10;
const GIF_REFRESH_INTERVAL = 60000; // 60 seconds per new GIF

let gifCache = [];
let lastFetch = 0;

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

// Routes
app.get("/api/random-gif", (req, res) => {
  if (gifCache.length === 0) {
    return res.status(503).json({ error: "No GIFs yet." });
  }
  const randomIndex = Math.floor(Math.random() * gifCache.length);
  res.json({ url: gifCache[randomIndex] });
});

app.get("/api/gif-cache", (req, res) => {
  res.json({ gifs: gifCache });
});

app.listen(PORT, () => {
  console.log(`🧠 Brainstem online at http://localhost:${PORT}`);
});
