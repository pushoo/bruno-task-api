// gRPC server on localhost:50051 (proto/tasks.proto), with server reflection.
// Same store and same rule: reads are public, CreateTask needs metadata
//   authorization: Bearer <token>

const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { ReflectionService } = require('@grpc/reflection');
const store = require('./store');
const { isValidAuthHeader } = require('./auth');
const { validateTask } = require('./validate');

const PROTO_PATH = path.join(__dirname, '..', 'proto', 'tasks.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const proto = grpc.loadPackageDefinition(packageDefinition).tasks.v1;

const toMessage = (t) => t && ({
  id: t.id, title: t.title, done: t.done, priority: t.priority,
  created_at: t.createdAt, updated_at: t.updatedAt,
});

const log = (method, status) => console.log(`gRPC ${method} -> ${status}`);

const handlers = {
  ListTasks(call, callback) {
    const { priority, search } = call.request;
    const tasks = store.list({ priority: priority || undefined, search: search || undefined });
    log('ListTasks', 'OK');
    callback(null, { count: tasks.length, tasks: tasks.map(toMessage) });
  },

  GetTask(call, callback) {
    const task = store.get(call.request.id);
    if (!task) {
      log('GetTask', 'NOT_FOUND');
      return callback({ code: grpc.status.NOT_FOUND, details: `Task ${call.request.id} not found` });
    }
    log('GetTask', 'OK');
    callback(null, toMessage(task));
  },

  CreateTask(call, callback) {
    const [header] = call.metadata.get('authorization');
    if (!isValidAuthHeader(String(header || ''))) {
      log('CreateTask', 'UNAUTHENTICATED');
      return callback({ code: grpc.status.UNAUTHENTICATED, details: 'Missing or invalid Bearer token in metadata "authorization"' });
    }
    const input = { title: call.request.title, priority: call.request.priority || 'medium' };
    const errors = validateTask(input);
    if (errors.length) {
      log('CreateTask', 'INVALID_ARGUMENT');
      return callback({ code: grpc.status.INVALID_ARGUMENT, details: errors.join('; ') });
    }
    const task = store.create({ ...input, title: input.title.trim() });
    log('CreateTask', 'OK');
    callback(null, toMessage(task));
  },

  WatchTasks(call) {
    log('WatchTasks', 'stream opened');
    const onChange = (event) => call.write({ type: event.type, task: toMessage(event.task) || undefined, at: new Date().toISOString() });
    store.events.on('change', onChange);
    const stop = () => { store.events.off('change', onChange); };
    call.on('cancelled', () => { stop(); log('WatchTasks', 'stream cancelled'); });
    call.on('close', stop);
  },
};

function startGrpc(port = 50051) {
  const server = new grpc.Server();
  server.addService(proto.TaskService.service, handlers);
  new ReflectionService(packageDefinition).addToServer(server);
  return new Promise((resolve, reject) => {
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
      if (err) return reject(err);
      resolve({ server, port: boundPort });
    });
  });
}

module.exports = { startGrpc };
