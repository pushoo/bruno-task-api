# Task API: demo app for the Bruno series

A small Node.js app that speaks REST, GraphQL, WebSocket, gRPC and MCP, all backed by one in-memory task store.
It comes with a ready-to-open Bruno collection that tests it. Built for the CISSP Coffee Shot series
"Bruno API Testing: Zero to AI (MCP)".

## Run it

```bash
npm install
npm start          # or: npm run dev  (auto-restarts on save)
```

| What | Where |
|---|---|
| Health | http://localhost:3000/health |
| REST | http://localhost:3000/api/tasks |
| OpenAPI spec | http://localhost:3000/openapi.yaml |
| GraphQL | http://localhost:3000/graphql |
| WebSocket | ws://localhost:3000/ws |
| gRPC | localhost:50051 (server reflection on, contract in `proto/tasks.proto`) |
| MCP | http://localhost:3000/mcp |

Needs Node.js 18 or newer. Change ports with `PORT=3001 GRPC_PORT=50052 npm start` (handy for a second "staging" server).

## Open the tests in Bruno

1. Bruno, then **Open Collection**, then pick the `bruno` folder.
2. Top-right environment dropdown, then **Local**.
3. Run `01 Setup / Login` first (it saves the token), or right-click the collection and **Run** to run everything.

From the terminal:

```bash
npm test               # bru run --env Local --exclude-tags app-only
npm run check:extras   # quick checks for OpenAPI, GraphQL, WebSocket and gRPC (server must be running)
```

## REST endpoints

| Method | Path | Auth | What it does |
|---|---|---|---|
| POST | /api/auth/login | none | `{"username":"admin","password":"password123"}` gives a Bearer token |
| GET | /api/tasks | none | List (filters: `?done=true&priority=high&search=word`) |
| GET | /api/tasks/:id | none | Get one |
| POST | /api/tasks | Bearer | Create `{"title","priority","done"}` (201) |
| PUT | /api/tasks/:id | Bearer | Replace every field |
| PATCH | /api/tasks/:id | Bearer | Change some fields |
| DELETE | /api/tasks/:id | Bearer | Delete (204) |
| POST | /api/reset | none | Back to the 3 starter tasks |

Rules: `title` has at least 3 characters, `priority` is `low`, `medium` or `high`, `done` is true or false.
Data lives in memory and resets on restart. The login is a **demo credential only**.

## GraphQL

`POST /graphql`. Queries: `tasks(done, priority, search)`, `task(id)`. Mutations: `createTask(title, priority)`, `setDone(id, done)`.
Mutations need `Authorization: Bearer <token>`, the same rule as REST. Introspection is on, so Bruno can load the schema.

## WebSocket

`ws://localhost:3000/ws`. On connect you get a `welcome` message. Then every change to a task, from any protocol,
arrives as `task.created`, `task.updated`, `task.deleted` or `tasks.reset`. Send `ping` and get a `pong`.

## gRPC

`localhost:50051`, service `tasks.v1.TaskService`: `ListTasks`, `GetTask`, `CreateTask` (needs metadata
`authorization: Bearer <token>`), and the server-streaming `WatchTasks`. Server reflection is on.

## MCP server

Streamable HTTP at `POST /mcp`, stateless, plain JSON responses (send header `Accept: application/json, text/event-stream`).
Tools: `list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`. They use the same data as every other protocol.

```bash
claude mcp add --transport http task-api http://localhost:3000/mcp   # Claude Code
npx @modelcontextprotocol/inspector                                  # MCP Inspector
```

## Collection map and episodes

| Folder | Shows | Episodes |
|---|---|---|
| 01 Setup | assertions, login, saving a token with a post-response script | 3, 6, 7 |
| 02 Tasks CRUD | GET, POST, PUT, PATCH, DELETE, query params, request chaining, tests | 3, 4, 7, 8 |
| 03 Negative Tests | 401, 400 and 404 checks | 8 |
| 04 MCP | initialize, tools/list, tools/call over raw JSON-RPC | 20 |
| 05 QA Test Cases (from episode-kits) | test cases with Docs, tags, boundary and state checks | 9 |
| 06 GraphQL, 07 WebSocket, 08 gRPC (from episode-kits) | other request types | 15, 16, 17 |
| 09 Security Checks (from episode-kits) | OWASP API Top 10 checks | 18 |

`episode-kits/` holds the prepared files for later episodes. See `episode-kits/README.md`.
`.github/workflows/api-tests.yml` runs the collection on every push and saves JUnit and HTML reports (episode 11).
