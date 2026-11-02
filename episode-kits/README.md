# Episode kits

Prepared files for episodes 5 to 23. Nothing here is part of the live collection until you copy it in,
so the Bruno sidebar and the Runner count stay exactly as they were for the earlier episodes.
Each episode's run sheet (in `Movies/Bruno Series/EpNN/`) says when to copy what, or when to build it live on camera instead.

Every file here was tested with the Bruno CLI 4.3.0 against the running Task API on 2 Nov 2026.

| Folder | Episode | What it holds |
|---|---|---|
| ep05-environments | 5 Environments and secrets | Local.bru with a secret variable (option A) or `{{process.env.TASK_API_PASSWORD}}` (option B), Staging.bru, .env.example, .gitignore lines |
| ep06-auth | 6 Auth | collection.bru with Bearer `{{token}}` (requests switch to "inherit") |
| ep07-scripts | 7 Scripts and chaining | collection.bru with an auto-login pre-request script, a request with pre and post scripts |
| ep09-qa-test-cases | 9 QA test cases | `05 QA Test Cases` (TC-00 to TC-12, Docs tab, tags), a data-driven folder and its CSV |
| ep13-mock-servers | 13 Mock servers | Mock.bru environment (baseUrl localhost:4000) |
| ep15-graphql | 15 GraphQL | `06 GraphQL` (query, variables, mutation with and without token) |
| ep16-websocket | 16 WebSocket | `07 WebSocket` (connect to ws://localhost:3000/ws, send ping). Tagged app-only |
| ep17-grpc | 17 gRPC | `08 gRPC` (ListTasks, CreateTask with metadata, WatchTasks stream). Tagged app-only |
| ep18-api-security | 18 API security testing | `09 Security Checks` (SEC-00 to SEC-09). SEC-07 fails until `app.disable('x-powered-by')` |
| ep21-claude-bruno-node | 21 Claude + Bruno + Node | .mcp.json and how to connect Claude |
| ep22-postman-to-bruno | 22 Postman to Bruno | A Postman v2.1 collection and environment to import, plus the hand fix |
| ep23-bruno-mistakes | 23 Bruno mistakes | `1 wrong` and `2 fixed` versions of each mistake |

## Why gRPC and WebSocket are tagged app-only

Bruno CLI 4.3.0 cannot run gRPC or WebSocket requests (it treats them as HTTP and fails).
`npm test` now runs `bru run --env Local --exclude-tags app-only`, so those two folders are sent from the app only.

## Check the newer endpoints

```bash
npm start                 # terminal 1
npm run check:extras      # terminal 2: OpenAPI, GraphQL, WebSocket, gRPC (16 checks)
npm test                  # the Bruno collection
```
