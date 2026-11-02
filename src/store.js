// In-memory task store shared by the REST API and the MCP server.
// Data resets every time the server restarts — perfect for repeatable demos.

const { randomUUID } = require('crypto');
const { EventEmitter } = require('events');

// Every change is announced here. The WebSocket and gRPC WatchTasks streams listen to it.
const events = new EventEmitter();
events.setMaxListeners(100);

let tasks = [];

function seed() {
  tasks = [
    { id: randomUUID(), title: 'Install Bruno', done: true, priority: 'high', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: randomUUID(), title: 'Send my first API request', done: false, priority: 'medium', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: randomUUID(), title: 'Test the MCP server', done: false, priority: 'low', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ];
}

seed();

const PRIORITIES = ['low', 'medium', 'high'];

function list({ done, priority, search } = {}) {
  return tasks.filter((t) => {
    if (done !== undefined && t.done !== done) return false;
    if (priority && t.priority !== priority) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
}

function get(id) {
  return tasks.find((t) => t.id === id) || null;
}

function create({ title, priority = 'medium', done = false }) {
  const now = new Date().toISOString();
  const task = { id: randomUUID(), title, done, priority, createdAt: now, updatedAt: now };
  tasks.push(task);
  events.emit('change', { type: 'task.created', task });
  return task;
}

function update(id, changes) {
  const task = get(id);
  if (!task) return null;
  for (const key of ['title', 'done', 'priority']) {
    if (changes[key] !== undefined) task[key] = changes[key];
  }
  task.updatedAt = new Date().toISOString();
  events.emit('change', { type: 'task.updated', task });
  return task;
}

function replace(id, { title, done = false, priority = 'medium' }) {
  const task = get(id);
  if (!task) return null;
  Object.assign(task, { title, done, priority, updatedAt: new Date().toISOString() });
  events.emit('change', { type: 'task.updated', task });
  return task;
}

function remove(id) {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;
  const [task] = tasks.splice(index, 1);
  events.emit('change', { type: 'task.deleted', task });
  return true;
}

function reset() {
  seed();
  events.emit('change', { type: 'tasks.reset', count: tasks.length });
  return tasks;
}

module.exports = { events, PRIORITIES, list, get, create, update, replace, remove, reset };
