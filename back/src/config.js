// Lee y valida las variables de entorno en un solo lugar.
import 'dotenv/config';

function obligatoria(nombre, descripcion) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} ${descripcion}`);
  return valor;
}

export const config = {
  puerto: process.env.PORT || 4000,
  frontUrl: process.env.FRONT_URL || 'http://localhost:4321',
  baseDeDatos: {
    databaseUrl: obligatoria('DATABASE_URL', 'con el connection string de Postgres'),
    ssl: process.env.DATABASE_SSL !== 'false',
  },
  jwt: {
    secreto: obligatoria('JWT_SECRET', 'para firmar los tokens'),
    duracion: '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/google/callback',
  },
};
