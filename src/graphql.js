// GraphQL endpoint: POST /graphql (GET works for queries too).
// Same store and same rule as REST: reading is public, changing data needs the Bearer token.

const { buildSchema, GraphQLError } = require('graphql');
const { createHandler } = require('graphql-http/lib/use/express');
const store = require('./store');
const { isValidAuthHeader } = require('./auth');
const { validateTask } = require('./validate');

const schema = buildSchema(`
  "A task in the Task API"
  type Task {
    id: ID!
    title: String!
    done: Boolean!
    priority: Priority!
    createdAt: String!
    updatedAt: String!
  }

  enum Priority { low medium high }

  type Query {
    "List tasks, with the same filters as GET /api/tasks"
    tasks(done: Boolean, priority: Priority, search: String): [Task!]!
    "One task by id, or null when it does not exist"
    task(id: ID!): Task
  }

  type Mutation {
    "Create a task. Needs the header Authorization: Bearer <token>"
    createTask(title: String!, priority: Priority = medium): Task!
    "Mark a task done or not done. Needs the Bearer token"
    setDone(id: ID!, done: Boolean!): Task
  }
`);

function requireToken(ctx) {
  if (!ctx.authorized) {
    throw new GraphQLError('Missing or invalid Bearer token. Call POST /api/auth/login first.', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
}

const rootValue = {
  tasks: (args) => store.list(args),
  task: ({ id }) => store.get(id),
  createTask: (args, ctx) => {
    requireToken(ctx);
    const errors = validateTask(args);
    if (errors.length) throw new GraphQLError(errors.join('; '), { extensions: { code: 'BAD_USER_INPUT' } });
    return store.create({ ...args, title: args.title.trim() });
  },
  setDone: ({ id, done }, ctx) => {
    requireToken(ctx);
    return store.update(id, { done });
  },
};

const graphqlHandler = createHandler({
  schema,
  rootValue,
  context: (req) => ({ authorized: isValidAuthHeader(req.raw.get('authorization')) }),
});

module.exports = { graphqlHandler, schema };
