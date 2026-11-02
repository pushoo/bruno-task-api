// REST API: CRUD for tasks + a simple login that returns a Bearer token.
// GET routes are public. Write routes (POST, PUT, PATCH, DELETE) need a token.

const express = require('express');
const store = require('./store');
const { login, isValidAuthHeader } = require('./auth');
const { validateTask } = require('./validate');

const router = express.Router();

// ---- Demo login (test credentials only, never use real passwords here) ----
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const session = login(username, password);
  if (!session) return res.status(401).json({ error: 'Invalid username or password' });
  res.json(session);
});

function requireAuth(req, res, next) {
  if (!isValidAuthHeader(req.get('authorization'))) {
    return res.status(401).json({ error: 'Missing or invalid Bearer token. Call POST /api/auth/login first.' });
  }
  next();
}

// ---- Routes ----
router.get('/tasks', (req, res) => {
  const { done, priority, search } = req.query;
  const filters = { priority, search };
  if (done === 'true') filters.done = true;
  if (done === 'false') filters.done = false;
  const tasks = store.list(filters);
  res.json({ count: tasks.length, tasks });
});

router.get('/tasks/:id', (req, res) => {
  const task = store.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

router.post('/tasks', requireAuth, (req, res) => {
  const errors = validateTask(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const task = store.create({ ...req.body, title: req.body.title.trim() });
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
});

router.put('/tasks/:id', requireAuth, (req, res) => {
  const errors = validateTask(req.body);
  if (errors.length) return res.status(400).json({ errors });
  const task = store.replace(req.params.id, { ...req.body, title: req.body.title.trim() });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

router.patch('/tasks/:id', requireAuth, (req, res) => {
  const errors = validateTask(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });
  const task = store.update(req.params.id, req.body);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

router.delete('/tasks/:id', requireAuth, (req, res) => {
  if (!store.remove(req.params.id)) return res.status(404).json({ error: 'Task not found' });
  res.status(204).end();
});

// Handy for demos: put the data back to the 3 starter tasks.
router.post('/reset', (req, res) => {
  res.json({ message: 'Data reset', tasks: store.reset() });
});

module.exports = router;
