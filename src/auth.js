// Demo auth shared by REST, GraphQL, WebSocket and gRPC.
// Test credentials only. Never put real passwords in a demo app.

const { randomUUID } = require('crypto');

const DEMO_USER = { username: 'admin', password: 'password123' };
const activeTokens = new Set();

function login(username, password) {
  if (username !== DEMO_USER.username || password !== DEMO_USER.password) return null;
  const token = randomUUID();
  activeTokens.add(token);
  return { token, tokenType: 'Bearer', expiresIn: 3600 };
}

// Accepts a full header value ("Bearer abc") and says whether it is a live token.
function isValidAuthHeader(header = '') {
  const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : null;
  return Boolean(token && activeTokens.has(token));
}

module.exports = { login, isValidAuthHeader };
