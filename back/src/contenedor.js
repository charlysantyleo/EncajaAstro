// CONTENEDOR (composition root): el unico lugar donde se decide que adaptador cumple cada puerto.
// Para cambiar una tecnologia (otra base de datos, otro proveedor de login, Redis para eventos...)
// se escribe el adaptador nuevo y se cambia UNA linea aqui. Los casos de uso no se enteran.
import { crearPool, crearTransaccion } from './adaptadores/salida/postgres/conexion.js';
import { crearRepositorios } from './adaptadores/salida/postgres/repositorios.js';
import { crearTokensJwt } from './adaptadores/salida/seguridad/tokensJwt.js';
import { crearPasswordsBcrypt } from './adaptadores/salida/seguridad/passwordsBcrypt.js';
import { crearIdentidadGoogle } from './adaptadores/salida/google/identidadGoogle.js';
import { crearEventosEnMemoria } from './adaptadores/salida/eventos/eventosEnMemoria.js';
import { crearPasarelaMercadoPago } from './adaptadores/salida/pagos/pasarelaMercadoPago.js';
import { crearPasarelaPaypal } from './adaptadores/salida/pagos/pasarelaPaypal.js';
import { crearCorreoBrevo } from './adaptadores/salida/correo/correoBrevo.js';
import { crearCorreoMailjet } from './adaptadores/salida/correo/correoMailjet.js';
import { crearCorreoEnConsola } from './adaptadores/salida/correo/correoEnConsola.js';
import { crearCatalogo } from './aplicacion/catalogo.js';
import { crearGarage } from './aplicacion/garage.js';
import { crearPedidos } from './aplicacion/pedidos.js';
import { crearCuentas } from './aplicacion/cuentas.js';
import { crearPagos } from './aplicacion/pagos.js';
import { crearDirecciones } from './aplicacion/direcciones.js';
import { crearAjustes } from './aplicacion/ajustes.js';
import { crearVehiculos } from './aplicacion/vehiculos.js';
import { crearActividad } from './aplicacion/actividad.js';
import { crearTablero } from './aplicacion/tablero.js';
import { crearActividadMongo } from './adaptadores/salida/mongo/actividadMongo.js';
import { crearActividadDesactivada } from './adaptadores/salida/mongo/actividadDesactivada.js';
import { PROVEEDORES } from './dominio/pagos.js';

// El pool se puede inyectar para correr la aplicacion contra otra base (por ejemplo, una en memoria en pruebas).
export function armarAplicacion(config, { pool = crearPool(config.baseDeDatos) } = {}) {
  // Adaptadores de salida (implementan los puertos de src/puertos/salida.js)
  const repos = crearRepositorios(pool);
  const transaccion = crearTransaccion(pool, crearRepositorios);
  const tokens = crearTokensJwt(config.jwt);
  const passwords = crearPasswordsBcrypt();
  const identidad = crearIdentidadGoogle(config.google);
  const eventos = crearEventosEnMemoria();
  // Se usa el primer proveedor de correo que tenga sus claves y un remitente; si ninguno, la consola.
  const { mailjetApiKey, mailjetSecretKey, brevoApiKey, remitente } = config.correo;
  const correo =
    remitente && mailjetApiKey && mailjetSecretKey
      ? crearCorreoMailjet(config.correo)
      : remitente && brevoApiKey
        ? crearCorreoBrevo(config.correo)
        : crearCorreoEnConsola();
  // La actividad va a MongoDB si hay MONGODB_URI; si no, la tienda funciona igual y no se guarda.
  const registroDeActividad = config.mongo?.uri ? crearActividadMongo(config.mongo) : crearActividadDesactivada();
  const pasarelas = {
    [PROVEEDORES.MERCADO_PAGO]: crearPasarelaMercadoPago(config.mercadoPago),
    [PROVEEDORES.PAYPAL]: crearPasarelaPaypal(config.paypal),
  };

  // Casos de uso, cada uno recibe solo los puertos que necesita
  const pagos = crearPagos({
    repos,
    transaccion,
    eventos,
    pasarelas,
    urls: { front: config.frontUrl, publica: config.urlPublica },
  });
  const ajustes = crearAjustes({ repos });
  const direcciones = crearDirecciones({ repos, ajustes });
  const actividad = crearActividad({ actividad: registroDeActividad, eventos, repos });
  const casos = {
    catalogo: crearCatalogo({ repos, eventos, ajustes, actividad }),
    garage: crearGarage({ repos, transaccion, actividad }),
    vehiculos: crearVehiculos({ repos }),
    pedidos: crearPedidos({ repos, transaccion, eventos, pagos, direcciones, ajustes, actividad }),
    actividad,
    tablero: crearTablero({ repos, actividad: registroDeActividad }),
    cuentas: crearCuentas({ repos, tokens, passwords, identidad, correo, frontUrl: config.frontUrl }),
    pagos,
    direcciones,
    ajustes,
  };

  return { casos, eventos, pool, actividad: registroDeActividad };
}
