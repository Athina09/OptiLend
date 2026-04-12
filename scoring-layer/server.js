/**
 * Optilend — standalone data-centric scoring API (Express).
 * Demo: similarity to synthetic MSME corpus + rule-based features → explainable 300–900 score.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const scoreRoutes = require('./routes/score');

/** Default 5055 — change with PORT= env if needed (5050 is often already in use). */
const PORT = Number(process.env.PORT) || 5055;
const app = express();

/** Browser may POST from Next (different port) or from deployed UI — avoid silent “stuck” demo scores. */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '256kb' }));

// Load corpus once — changing data/dataset.json changes scores (data-centric proof)
const datasetPath = path.join(__dirname, 'data', 'dataset.json');
let dataset = [];
try {
  const raw = fs.readFileSync(datasetPath, 'utf8');
  dataset = JSON.parse(raw);
  if (!Array.isArray(dataset)) dataset = [];
} catch (e) {
  console.error('[Optilend] Failed to load dataset.json:', e.message);
}

app.locals.dataset = dataset;

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'optilend-scoring-layer',
    datasetRecords: dataset.length,
  });
});

app.use('/score', scoreRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const server = app.listen(PORT, () => {
  console.log(`[Optilend] Scoring layer listening on http://localhost:${PORT}`);
  console.log(`[Optilend] POST /score  |  GET /health  |  dataset records: ${dataset.length}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[Optilend] Port ${PORT} is already in use. Stop the other process or run:\n` +
        `  PORT=5051 npm start   or   npm run start:5051\n` +
        `Or free this port:  lsof -ti :${PORT} | xargs kill`
    );
    process.exit(1);
  }
  throw err;
});
