// Adaptador de entrada: el servidor HTTP + WebSocket que expone la aplicacion.
// Express sirve /graphql (queries y mutations) y /auth/google; el WebSocket sirve las suscripciones.
import http from 'http';
import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { typeDefs } from '../graphql/schema.js';
import { crearResolvers } from '../graphql/resolvers.js';
import { formatearError } from '../graphql/errores.js';
import { crearRutasGoogle } from './rutasGoogle.js';

export async function iniciarServidor({ casos, eventos, config }) {
  const schema = makeExecutableSchema({ typeDefs, resolvers: crearResolvers(casos, eventos) });

  const app = express();
  const httpServer = http.createServer(app);

  // Suscripciones: en WebSocket no hay encabezados, el JWT llega en connectionParams al conectar.
  const wsServer = new WebSocketServer({ server: httpServer, path: '/graphql' });
  const servidorWs = useServer(
    { schema, context: (ctx) => ({ actor: casos.cuentas.actorDesde(ctx.connectionParams?.authorization) }) },
    wsServer
  );

  const apollo = new ApolloServer({
    schema,
    formatError: formatearError,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await servidorWs.dispose();
            },
          };
        },
      },
    ],
  });
  await apollo.start();

  app.use(crearRutasGoogle(casos, config));

  // Cada peticion GraphQL lee el JWT del encabezado Authorization; actor queda en null si es invitado.
  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(apollo, {
      context: async ({ req }) => ({ actor: casos.cuentas.actorDesde(req.headers.authorization) }),
    })
  );

  await new Promise((listo) => httpServer.listen(config.puerto, listo));
  console.log(`Servidor GraphQL listo en http://localhost:${config.puerto}/graphql`);
  console.log(`Subscripciones GraphQL listas en ws://localhost:${config.puerto}/graphql`);
  return httpServer;
}
