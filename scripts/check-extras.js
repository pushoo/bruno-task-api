// Pre-recording check for the newer endpoints (OpenAPI, GraphQL, WebSocket, gRPC).
// Start the server first (npm start), then run: npm run check:extras
// The classic REST + MCP checks stay in the Bruno collection (npm test).

const path = require('path');
const WebSocket = require('ws');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const GRPC = process.env.GRPC_ADDR || 'localhost:50051';
let failed = 0;
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
  if (!cond) failed++;
};

async function json(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body, headers: res.headers };
}
const gql = (query, variables, token) => json(`${BASE}/graphql`, {
  method: 'POST',
  headers: token ? { Authorization: `Bearer ${token}` } : {},
  body: JSON.stringify({ query, variables }),
});

(async () => {
  await json(`${BASE}/api/reset`, { method: 'POST' });
  const { body: login } = await json(`${BASE}/api/auth/login`, { method: 'POST', body: JSON.stringify({ username: 'admin', password: 'password123' }) });
  const token = login.token;
  ok('login gives a token', typeof token === 'string');

  // OpenAPI
  const spec = await fetch(`${BASE}/openapi.yaml`);
  const specText = await spec.text();
  ok('GET /openapi.yaml', spec.status === 200 && specText.startsWith('openapi: 3'), spec.headers.get('content-type'));

  // GraphQL
  const q = await gql('{ tasks { id title priority done } }');
  ok('GraphQL query tasks', q.status === 200 && q.body.data.tasks.length === 3, `${q.body.data?.tasks?.length} tasks`);
  const f = await gql('query($p: Priority){ tasks(priority: $p) { title } }', { p: 'high' });
  ok('GraphQL query with variables', f.body.data.tasks.length === 1 && f.body.data.tasks[0].title === 'Install Bruno');
  const intro = await gql('{ __schema { mutationType { fields { name } } } }');
  ok('GraphQL introspection', intro.body.data.__schema.mutationType.fields.some((x) => x.name === 'createTask'));
  const noTok = await gql('mutation { createTask(title: "No token") { id } }');
  ok('GraphQL createTask without token is refused', noTok.body.errors?.[0]?.extensions?.code === 'UNAUTHENTICATED');
  const bad = await gql('mutation { createTask(title: "x") { id } }', null, token);
  ok('GraphQL createTask with short title is refused', bad.body.errors?.[0]?.extensions?.code === 'BAD_USER_INPUT');

  // WebSocket: connect, ping, then watch a REST create arrive as an event
  const wsUrl = BASE.replace(/^http/, 'ws') + '/ws';
  const ws = new WebSocket(wsUrl);
  const seen = [];
  ws.on('message', (m) => seen.push(JSON.parse(m.toString())));
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
  ws.send('ping');
  await new Promise((r) => setTimeout(r, 200));
  ok('WebSocket welcome + pong', seen[0]?.type === 'welcome' && seen.some((m) => m.type === 'pong'));

  // gRPC
  const def = protoLoader.loadSync(path.join(__dirname, '..', 'proto', 'tasks.proto'), { keepCase: true, defaults: true });
  const { TaskService } = grpc.loadPackageDefinition(def).tasks.v1;
  const client = new TaskService(GRPC, grpc.credentials.createInsecure());
  const call = (method, req, md) => new Promise((resolve) => client[method](req, md || new grpc.Metadata(), (err, res) => resolve({ err, res })));

  const events = [];
  const stream = client.WatchTasks({});
  stream.on('data', (e) => events.push(e));
  stream.on('error', () => {});
  await new Promise((r) => setTimeout(r, 200));

  const created = await gql('mutation($t: String!){ createTask(title: $t, priority: high) { id title } }', { t: 'Made with GraphQL' }, token);
  ok('GraphQL createTask with token', created.body.data?.createTask?.title === 'Made with GraphQL');
  await new Promise((r) => setTimeout(r, 300));
  ok('WebSocket got task.created', seen.some((m) => m.type === 'task.created' && m.task.title === 'Made with GraphQL'));
  ws.close();

  const list = await call('ListTasks', { priority: 'high' });
  ok('gRPC ListTasks', !list.err && list.res.count === 2, `count ${list.res?.count}`);
  const missing = await call('GetTask', { id: 'does-not-exist' });
  ok('gRPC GetTask not found', missing.err?.code === grpc.status.NOT_FOUND);
  const unauth = await call('CreateTask', { title: 'No token' });
  ok('gRPC CreateTask without token', unauth.err?.code === grpc.status.UNAUTHENTICATED);
  const md = new grpc.Metadata(); md.add('authorization', `Bearer ${token}`);
  const made = await call('CreateTask', { title: 'Made with gRPC', priority: 'low' }, md);
  ok('gRPC CreateTask with token', !made.err && made.res.title === 'Made with gRPC');
  await new Promise((r) => setTimeout(r, 300));
  ok('gRPC WatchTasks streamed both creates', events.filter((e) => e.type === 'task.created').length === 2, `${events.length} events`);
  stream.cancel();

  const viaRest = await json(`${BASE}/api/tasks?search=Made with`);
  ok('REST sees GraphQL + gRPC tasks', viaRest.body.count === 2);

  await json(`${BASE}/api/reset`, { method: 'POST' });
  client.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll extra checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
