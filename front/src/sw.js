/// <reference lib="webworker" />
// Service worker de EnCaja Autopartes (practica P3-3): la tienda sigue funcionando sin red.
//
// Ciclo de vida
//   install   guarda el "shell" (precache): HTML de inicio, nota y offline.html, el JavaScript, la fuente del
//             texto, los iconos y el manifiesto. Si falta uno, la instalacion falla y sigue la version anterior.
//   activate  borra las caches de versiones anteriores y toma el control de las pestanas abiertas (clients.claim).
//   fetch     decide de donde sale cada respuesta:
//               paginas (navegacion)   red primero; sin red, la copia guardada; si no hay, offline.html
//               catalogo/ficha (API)   red primero; sin red, la ultima respuesta guardada; si no hay, un error claro
//               recursos (JS, img...)  cache primero; si no esta, red y se guarda para la proxima
//   message   SKIP_WAITING: el usuario pidio la version nueva (actualizacion limpia, sin recargas sorpresa)
//   sync      (bono) envia los servicios de la bitacora que se registraron sin red y avisa con una notificacion
//
// @vite-pwa/astro compila este archivo (estrategia buildSW) y reemplaza self.__WB_MANIFEST por la lista del shell.

const SHELL = self.__WB_MANIFEST; // [{ url, revision }]
const API = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/graphql';
const ORIGEN_API = new URL(API).origin;

// La version sale del contenido del shell: cada deploy que cambia algun archivo es una version nueva.
const VERSION = huella(SHELL.map((e) => `${e.url}@${e.revision ?? ''}`).join('|'));
const CACHES = {
  shell: `encaja-shell-${VERSION}`,
  paginas: `encaja-paginas-${VERSION}`,
  recursos: `encaja-recursos-${VERSION}`,
  api: `encaja-api-${VERSION}`,
};
const LIMITE = { paginas: 60, recursos: 150, api: 120 };
const OFFLINE = new URL('/offline.html', self.location.origin).href;
// Con la red lenta (o "lie-fi") no se espera para siempre: si ya hay copia guardada, se usa a los 4 s.
const ESPERA_RED_MS = 4000;

// Consultas de solo lectura que vale la pena tener sin red: catalogo, ficha, opciones del selector de vehiculo,
// el garage y las reglas de envio (la nota las usa). Lo demas (pedidos, panel, pagos) no se guarda.
const CONSULTAS_GUARDABLES = new Set([
  'Categorias',
  'Productos',
  'Producto',
  'ProductoStock',
  'ReglasDeEnvio',
  'BuscarVehiculos',
  'MarcasDeVehiculos',
  'ModelosDeVehiculos',
  'AniosDeVehiculo',
  'MotoresDeVehiculo',
  'CatalogoDeMarca',
  'Vehiculos',
  'Vehiculo',
]);
// (bono) Cambios que se pueden mandar despues: anotar un servicio en la bitacora (en el taller no siempre hay senal).
const MUTACIONES_EN_COLA = new Set(['RegistrarMantenimiento']);

// ---------- install ----------

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHES.shell).then((cache) =>
      // cache: 'reload' salta la cache HTTP del navegador: el shell se baja fresco del servidor.
      cache.addAll(SHELL.map((e) => new Request(new URL(e.url, self.location.origin), { cache: 'reload' })))
    )
  );
  // Sin skipWaiting aqui: una version nueva espera a que el usuario la acepte (ver "message").
});

// ---------- activate ----------

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const vigentes = new Set(Object.values(CACHES));
      for (const nombre of await caches.keys()) {
        // Caches de versiones anteriores, y la del service worker generado en la practica P3-2.
        if ((nombre.startsWith('encaja-') && !vigentes.has(nombre)) || nombre.startsWith('workbox-precache')) {
          await caches.delete(nombre);
        }
      }
      // Controla desde ya las pestanas abiertas: no hace falta recargar para que funcione sin red.
      await self.clients.claim();
    })()
  );
});

// ---------- fetch ----------

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  const url = new URL(request.url);

  if (request.method === 'POST' && url.href === API) return evento.respondWith(graphql(evento));
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') return evento.respondWith(pagina(evento));
  if (esRecurso(url)) return evento.respondWith(recurso(evento));
  // Lo demas (otros dominios, sitemap, sw.js) va directo a la red, sin pasar por la cache.
});

function esRecurso(url) {
  if (url.origin === ORIGEN_API) return url.pathname.startsWith('/imagenes/'); // fotos subidas desde el panel
  if (url.origin !== self.location.origin || url.pathname === '/sw.js') return false;
  return /^\/(_astro|img|marca)\//.test(url.pathname) || /\.(png|webp|jpe?g|svg|ico|woff2?|webmanifest)$/.test(url.pathname);
}

// Paginas: red primero. La copia de cada pagina visitada queda guardada para cuando no haya red.
async function pagina(evento) {
  const clave = claveDePagina(evento.request.url);
  const red = fetch(evento.request);

  // Se guarda en segundo plano, sin retrasar la respuesta.
  evento.waitUntil(
    red
      .then((respuesta) => {
        if (respuesta.ok && respuesta.type === 'basic' && !respuesta.redirected) {
          return guardar(CACHES.paginas, clave, respuesta.clone(), LIMITE.paginas);
        }
      })
      .catch(() => {})
  );

  try {
    return await redConEspera(red, () => buscar(clave));
  } catch {
    return (await buscar(clave)) || (await buscar(OFFLINE)) || textoSinConexion();
  }
}

// /categoria/frenos y /categoria/frenos/?x=1 son la misma pagina guardada (los parametros los lee el navegador).
function claveDePagina(direccion) {
  const url = new URL(direccion);
  let ruta = url.pathname;
  if (!ruta.endsWith('/') && !/\.[a-z0-9]+$/i.test(ruta)) ruta += '/';
  return url.origin + ruta;
}

// Recursos: cache primero. El JavaScript del shell ya esta guardado desde la instalacion; imagenes y fuentes se
// guardan la primera vez que se usan.
async function recurso(evento) {
  const { request } = evento;
  const guardada = await buscar(request);
  if (guardada) return guardada;
  try {
    const respuesta = await fetch(request);
    // Las fotos del backend llegan "opacas" (sin CORS): se guardan igual, pero el tope de la cache las limita.
    const sirve = (respuesta.ok && respuesta.type === 'basic') || respuesta.type === 'opaque';
    if (sirve) evento.waitUntil(guardar(CACHES.recursos, request, respuesta.clone(), LIMITE.recursos));
    return respuesta;
  } catch {
    if (request.destination === 'image') return imagenSinConexion();
    return Response.error();
  }
}

// API GraphQL (POST, que la Cache API no guarda tal cual): cada consulta se guarda bajo una clave GET sintetica
// hecha con el cuerpo de la peticion y la sesion (el precio "para ti" cambia segun la cuenta).
async function graphql(evento) {
  const { request } = evento;
  const cuerpo = await request.clone().text();
  const [, tipo = 'query', nombre = ''] = leerOperacion(cuerpo);

  if (tipo === 'query' && CONSULTAS_GUARDABLES.has(nombre)) return consultaRedPrimero(evento, cuerpo);
  if (tipo === 'mutation' && MUTACIONES_EN_COLA.has(nombre)) return mutacionConCola(request, cuerpo, nombre);
  try {
    return await fetch(request);
  } catch {
    return errorGraphQL(
      tipo === 'mutation'
        ? 'Sin conexión: el cambio no se guardó. Revisa tu internet e inténtalo de nuevo.'
        : 'Sin conexión: esta información no está guardada en tu dispositivo. Ábrela una vez con internet y quedará disponible.',
      'SIN_CONEXION'
    );
  }
}

function leerOperacion(cuerpo) {
  try {
    return JSON.parse(cuerpo).query.match(/^\s*(query|mutation|subscription)\s+(\w+)/) ?? [];
  } catch {
    return [];
  }
}

async function consultaRedPrimero(evento, cuerpo) {
  const { request } = evento;
  const clave = await claveDeConsulta(cuerpo, request.headers.get('Authorization'));
  const red = fetch(request);

  evento.waitUntil(
    red
      .then(async (respuesta) => {
        if (!respuesta.ok) return;
        const texto = await respuesta.clone().text();
        // Solo respuestas completas: un error del servidor no reemplaza a la ultima copia buena.
        if (JSON.parse(texto).errors) return;
        const copia = new Response(texto, { headers: { 'Content-Type': 'application/json', 'X-Guardado': new Date().toISOString() } });
        await guardar(CACHES.api, clave, copia, LIMITE.api);
      })
      .catch(() => {})
  );

  try {
    return await redConEspera(red, () => buscar(clave));
  } catch {
    return (
      (await buscar(clave)) ||
      errorGraphQL('Sin conexión: esta búsqueda no está guardada en tu dispositivo. Se mostrará cuando vuelva la red.', 'SIN_CONEXION')
    );
  }
}

async function claveDeConsulta(cuerpo, autorizacion) {
  const datos = new TextEncoder().encode(`${autorizacion ?? 'invitado'}\n${cuerpo}`);
  const resumen = new Uint8Array(await crypto.subtle.digest('SHA-256', datos));
  const hex = Array.from(resumen, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${API}?guardado=${hex}`;
}

// ---------- utilidades ----------

// Busca en todas las caches de la tienda. ignoreVary: algunos servidores responden con "Vary: Origin" y los
// modulos JS y las fuentes se piden con encabezado Origin; sin esto no coincidirian con lo guardado al instalar.
function buscar(clave) {
  return caches.match(clave, { ignoreVary: true });
}

// Red primero con limite: si la red tarda mas de ESPERA_RED_MS y ya hay copia, se responde con la copia (la red
// sigue y actualiza la cache). Si no hay copia, se espera a la red. Si la red falla, la promesa se rechaza.
function redConEspera(red, buscarCopia) {
  const copiaTardia = new Promise((resolver) => setTimeout(resolver, ESPERA_RED_MS))
    .then(buscarCopia)
    .then((copia) => copia || red);
  return Promise.race([red, copiaTardia]);
}

async function guardar(nombre, clave, respuesta, limite) {
  const cache = await caches.open(nombre);
  await cache.put(clave, respuesta);
  // Tope de entradas: se van las mas viejas (cache.keys() respeta el orden en que se guardaron).
  const claves = await cache.keys();
  for (const vieja of claves.slice(0, Math.max(0, claves.length - limite))) await cache.delete(vieja);
}

function errorGraphQL(mensaje, codigo) {
  return new Response(JSON.stringify({ errors: [{ message: mensaje, extensions: { code: codigo } }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function textoSinConexion() {
  return new Response('Sin conexión y esta página no está guardada.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function imagenSinConexion() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 144"><rect width="192" height="144" fill="#f0f0ed"/><text x="96" y="78" font-family="system-ui,sans-serif" font-size="13" fill="#63635f" text-anchor="middle">Foto sin conexión</text></svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}

// FNV-1a de 32 bits: basta para distinguir versiones del shell.
function huella(texto) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

// ---------- message: actualizacion limpia ----------

self.addEventListener('message', (evento) => {
  // La pagina muestra "Hay una version nueva" y, si el usuario acepta, pide saltar la espera. Al activarse,
  // clients.claim() toma las pestanas y la pagina se recarga una sola vez con la version nueva.
  if (evento.data?.type === 'SKIP_WAITING') self.skipWaiting();
  // Sin Background Sync (Firefox, Safari), la pagina avisa cuando vuelve la red.
  if (evento.data?.type === 'REINTENTAR_COLA') evento.waitUntil(enviarCola());
});

// ---------- (bono) Background Sync + Notification API ----------

async function mutacionConCola(request, cuerpo, nombre) {
  try {
    return await fetch(request);
  } catch {
    await cola.agregar({ cuerpo, autorizacion: request.headers.get('Authorization'), nombre, fecha: Date.now() });
    try {
      await self.registration.sync.register('encaja-cola');
    } catch {
      // Sin Background Sync: se envia con el aviso "REINTENTAR_COLA" de la pagina.
    }
    return errorGraphQL(
      'Sin conexión: guardamos el servicio en tu dispositivo y se enviará solo en cuanto vuelva la red.',
      'EN_COLA'
    );
  }
}

self.addEventListener('sync', (evento) => {
  if (evento.tag === 'encaja-cola') evento.waitUntil(enviarCola());
});

let enviando = null;
function enviarCola() {
  // Un solo envio a la vez (pueden llegar el evento sync y el aviso de la pagina juntos).
  enviando ??= (async () => {
    let enviados = 0;
    const rechazados = [];
    for (const pendiente of await cola.todos()) {
      // Si no hay red, fetch lanza error: el sync queda pendiente y el navegador lo reintenta despues.
      const respuesta = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(pendiente.autorizacion ? { Authorization: pendiente.autorizacion } : {}) },
        body: pendiente.cuerpo,
      });
      const resultado = await respuesta.json().catch(() => ({}));
      await cola.borrar(pendiente.id);
      if (respuesta.ok && !resultado.errors) enviados++;
      else rechazados.push(resultado.errors?.[0]?.message ?? `estado ${respuesta.status}`);
    }
    if (enviados || rechazados.length) await avisarEnvio(enviados, rechazados);
  })().finally(() => {
    enviando = null;
  });
  return enviando;
}

async function avisarEnvio(enviados, rechazados) {
  const pestanas = await self.clients.matchAll({ type: 'window' });
  for (const pestana of pestanas) pestana.postMessage({ type: 'COLA_ENVIADA', enviados, rechazados });
  if (self.Notification?.permission !== 'granted') return;
  const titulo = rechazados.length ? 'Un servicio no se pudo guardar' : 'Bitácora al día';
  const cuerpo = rechazados.length
    ? `El servidor lo rechazó: ${rechazados[0]}`
    : enviados === 1
      ? 'Ya se guardó el servicio que anotaste sin conexión.'
      : `Ya se guardaron los ${enviados} servicios que anotaste sin conexión.`;
  await self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'encaja-cola',
    data: { url: '/garage/' },
  });
}

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil(
    (async () => {
      const destino = new URL(evento.notification.data?.url ?? '/', self.location.origin).href;
      const pestanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const abierta = pestanas.find((p) => p.url.startsWith(self.location.origin));
      if (abierta) return abierta.focus();
      return self.clients.openWindow(destino);
    })()
  );
});

// Cola en IndexedDB (sobrevive a cerrar el navegador).
const cola = {
  abrir() {
    return new Promise((resolver, rechazar) => {
      const peticion = indexedDB.open('encaja', 1);
      peticion.onupgradeneeded = () => peticion.result.createObjectStore('cola', { keyPath: 'id', autoIncrement: true });
      peticion.onsuccess = () => resolver(peticion.result);
      peticion.onerror = () => rechazar(peticion.error);
    });
  },
  async operar(modo, accion) {
    const db = await cola.abrir();
    return new Promise((resolver, rechazar) => {
      const transaccion = db.transaction('cola', modo);
      const peticion = accion(transaccion.objectStore('cola'));
      transaccion.oncomplete = () => resolver(peticion?.result);
      transaccion.onerror = () => rechazar(transaccion.error);
    });
  },
  agregar: (pendiente) => cola.operar('readwrite', (almacen) => almacen.add(pendiente)),
  todos: () => cola.operar('readonly', (almacen) => almacen.getAll()),
  borrar: (id) => cola.operar('readwrite', (almacen) => almacen.delete(id)),
};
