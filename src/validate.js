// One set of task rules, used by REST, GraphQL and gRPC so they all agree.
const { PRIORITIES } = require('./store');

function validateTask(body, { partial = false } = {}) {
  const errors = [];
  if (!body || typeof body !== 'object') return ['Request body must be JSON'];
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length < 3) {
      errors.push('title is required and must be at least 3 characters');
    }
  }
  if (body.done !== undefined && typeof body.done !== 'boolean') errors.push('done must be true or false');
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority)) {
    errors.push(`priority must be one of: ${PRIORITIES.join(', ')}`);
  }
  return errors;
}

module.exports = { validateTask };
