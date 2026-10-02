// CONTENEDOR (composition root): el unico lugar donde se decide que adaptador cumple cada puerto.
// Para cambiar una tecnologia (otra base de datos, otro proveedor de login, Redis para eventos...)
// se escribe el adaptador nuevo y se cambia UNA linea aqui. Los casos de uso no se enteran.
import { crearPool, crearTransaccion } from './adaptadores/salida/postgres/conexion.js';
import { crearRepositorios } from './adaptadores/salida/postgres/repositorios.js';
import { crearTokensJwt } from './adaptadores/salida/seguridad/tokensJwt.js';
import { crearPasswordsBcrypt } from './adaptadores/salida/seguridad/passwordsBcrypt.js';
import { crearIdentidadGoogle } from './adaptadores/salida/google/identidadGoogle.js';
import { crearEventosEnMemoria } from './adaptadores/salida/eventos/eventosEnMemoria.js';
import { crearCatalogo } from './aplicacion/catalogo.js';
import { crearGarage } from './aplicacion/garage.js';
import { crearPedidos } from './aplicacion/pedidos.js';
import { crearCuentas } from './aplicacion/cuentas.js';

export function armarAplicacion(config) {
  // Adaptadores de salida (implementan los puertos de src/puertos/salida.js)
  const pool = crearPool(config.baseDeDatos);
  const repos = crearRepositorios(pool);
  const transaccion = crearTransaccion(pool, crearRepositorios);
  const tokens = crearTokensJwt(config.jwt);
  const passwords = crearPasswordsBcrypt();
  const identidad = crearIdentidadGoogle(config.google);
  const eventos = crearEventosEnMemoria();

  // Casos de uso, cada uno recibe solo los puertos que necesita
  const casos = {
    catalogo: crearCatalogo({ repos, eventos }),
    garage: crearGarage({ repos, transaccion }),
    pedidos: crearPedidos({ repos, transaccion, eventos }),
    cuentas: crearCuentas({ repos, tokens, passwords, identidad }),
  };

  return { casos, eventos, pool };
}
