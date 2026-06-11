require('dotenv').config();
const express = require('express');
const path = require('path');
const { syncData } = require('./services/dataFetcher');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Admin auth middleware — applied only to mutating admin routes
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-password'] || req.body?.adminPassword;
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorised' });
  }
  next();
}

// Public API routes
app.use('/api/teams', require('./routes/teams'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/weights', require('./routes/weights'));

// Protect mutating endpoints
app.use('/api/sync', requireAdmin);
app.use('/api/weights', (req, res, next) => {
  if (req.method === 'GET') return next();
  requireAdmin(req, res, next);
});
app.use('/api/matches', (req, res, next) => {
  if (req.method === 'GET') return next();
  requireAdmin(req, res, next);
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// Auto-sync every 30 minutes if API key present
if (process.env.FOOTBALL_DATA_API_KEY) {
  const THIRTY_MIN = 30 * 60 * 1000;
  setInterval(() => {
    console.log('[AutoSync] Running scheduled sync...');
    syncData().then(r => console.log('[AutoSync]', r.status));
  }, THIRTY_MIN);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
