// Punto de arranque: arma la aplicacion (src/contenedor.js) y levanta el servidor.
import { config } from './src/config.js';
import { armarAplicacion } from './src/contenedor.js';
import { iniciarServidor } from './src/adaptadores/entrada/http/servidor.js';

const { casos, eventos } = armarAplicacion(config);
await iniciarServidor({ casos, eventos, config });
