// /offline.html: respaldo del service worker (practica P3-3) cuando no hay red y la pagina pedida no esta guardada.
// Se genera en el build con los textos de TODOS los idiomas de astro.config.mjs (seccion "offline" de cada JSON), y
// en el navegador se elige el de la ruta que se pidio (/en/... -> ingles). Todo va dentro del archivo (estilos
// incluidos) para que funcione sin pedir nada mas a la red.
import { IDIOMAS, IDIOMA_BASE, datos } from '../i18n';
import { rutasPara } from '../lib/rutas';

const escapar = (texto) => String(texto).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function GET() {
  const textos = Object.fromEntries(
    IDIOMAS.map((idioma) => [idioma, { ...datos(idioma).offline, app: datos(idioma).app.nombre, nota: datos(idioma).offline.nota, carrito: `${rutasPara(idioma).carrito}/`, home: rutasPara(idioma).home }])
  );
  const base = textos[IDIOMA_BASE];
  const json = JSON.stringify({ base: IDIOMA_BASE, textos }).replace(/</g, '\\u003c');

  const html = `<!doctype html>
<html lang="${IDIOMA_BASE}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex" />
    <title>${escapar(base.titulo)}</title>
    <meta name="theme-color" content="#E10600" />
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <style>
      :root {
        color-scheme: light dark;
        --papel: #f7f7f5; --superficie: #ffffff; --tinta: #0e0e0e; --tinta-2: #4a4a47;
        --regla: #0e0e0e; --regla-suave: #d9d9d4; --rojo: #e10600; --rojo-hondo: #b80500;
      }
      @media (prefers-color-scheme: dark) {
        :root { --papel: #0d0d0d; --superficie: #141413; --tinta: #f2f2ef; --tinta-2: #b9b9b4; --regla: #f2f2ef; --regla-suave: #2b2b29; }
      }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; min-height: 100dvh; background: var(--papel); color: var(--tinta); font: 16px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
      .cabecera { border-bottom: 3px solid var(--regla); background: var(--superficie); padding-top: env(safe-area-inset-top, 0px); }
      .cabecera div, main { max-width: 760px; margin: 0 auto; padding: 16px max(20px, env(safe-area-inset-right, 0px)) 16px max(20px, env(safe-area-inset-left, 0px)); }
      .logo { display: block; height: 34px; }
      @media (prefers-color-scheme: dark) { .logo { content: url('/marca/logo-oscuro.webp'); } }
      main { padding-top: 48px; }
      .etiqueta { display: inline-block; margin: 0 0 16px; padding: 4px 10px; background: var(--rojo); color: #fff; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
      h1 { margin: 0 0 12px; font-size: clamp(32px, 7vw, 52px); line-height: 1.02; letter-spacing: -0.03em; }
      p { margin: 0 0 16px; color: var(--tinta-2); max-width: 60ch; }
      code { font-family: ui-monospace, Consolas, monospace; font-size: 0.92em; color: var(--tinta); overflow-wrap: anywhere; }
      .acciones { display: flex; flex-wrap: wrap; gap: 12px; margin: 24px 0 40px; }
      .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 20px; border: 1px solid var(--tinta); background: transparent; color: var(--tinta); font: inherit; font-weight: 600; text-decoration: none; cursor: pointer; }
      .btn-primario { border-color: var(--rojo); background: var(--rojo); color: #fff; }
      .btn:focus-visible { outline: 2px solid var(--rojo); outline-offset: 2px; }
      h2 { margin: 0 0 8px; padding-top: 24px; border-top: 1px solid var(--regla-suave); font-size: 20px; }
      ul { margin: 12px 0 0; padding: 0; list-style: none; }
      li a { display: flex; justify-content: space-between; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--regla-suave); color: var(--tinta); font-weight: 600; text-decoration: none; }
      li a span { color: var(--tinta-2); font-weight: 400; font-family: ui-monospace, Consolas, monospace; font-size: 13px; }
      li a:hover { color: var(--rojo); }
      @media (hover: hover) { .btn-primario:hover { background: var(--rojo-hondo); } }
    </style>
  </head>
  <body>
    <header class="cabecera">
      <div><a href="${base.home}" id="inicio"><img class="logo" src="/marca/logo.webp" alt="${escapar(base.app)}" width="148" height="34" /></a></div>
    </header>
    <main>
      <p class="etiqueta" data-texto="etiqueta">${escapar(base.etiqueta)}</p>
      <h1 data-texto="encabezado">${escapar(base.encabezado)}</h1>
      <p><span data-texto="antesDeRuta">${escapar(base.antesDeRuta)}</span> <code id="ruta" data-texto="estaPagina">${escapar(base.estaPagina)}</code> <span data-texto="despuesDeRuta">${escapar(base.despuesDeRuta)}</span></p>
      <p data-texto="nota">${escapar(base.nota)}</p>
      <div class="acciones">
        <button class="btn btn-primario" type="button" id="reintentar" data-texto="reintentar">${escapar(base.reintentar)}</button>
        <a class="btn" href="${base.carrito}" id="ver-nota" data-texto="verNota">${escapar(base.verNota)}</a>
      </div>
      <section aria-labelledby="guardadas-titulo" id="guardadas" hidden>
        <h2 id="guardadas-titulo" data-texto="guardadas">${escapar(base.guardadas)}</h2>
        <p data-texto="guardadasTexto">${escapar(base.guardadasTexto)}</p>
        <ul id="lista"></ul>
      </section>
    </main>

    <script>
      const { base, textos } = ${json};
      // Idioma: el de la ruta que se pidio (/en/... -> 'en'); si no trae prefijo de idioma, el base.
      const primero = location.pathname.split('/')[1];
      const idioma = primero !== base && textos[primero] ? primero : base;
      const t = textos[idioma];
      const delIdioma = (camino) => {
        const p = camino.split('/')[1];
        return (p !== base && textos[p] ? p : base) === idioma;
      };
      if (idioma !== base) {
        document.documentElement.lang = idioma;
        document.title = t.titulo;
        document.querySelectorAll('[data-texto]').forEach((el) => (el.textContent = t[el.dataset.texto]));
        document.getElementById('ver-nota').setAttribute('href', t.carrito);
        document.getElementById('inicio').setAttribute('href', t.home);
        document.querySelector('.logo').alt = t.app;
      }

      // La URL que se ve es la que se pidio (el service worker responde con este archivo en su lugar).
      if (location.pathname !== '/offline.html') document.getElementById('ruta').textContent = location.pathname;

      document.getElementById('reintentar').addEventListener('click', () => location.reload());
      // En cuanto vuelve la red, se intenta otra vez solo. Pero no si el usuario ya se va a otra pagina: la
      // emulacion de red de DevTools lanza un "online" al navegar, y recargar aqui cancelaria esa navegacion.
      let saliendo = false;
      window.addEventListener('beforeunload', () => (saliendo = true));
      window.addEventListener('pagehide', () => (saliendo = true));
      window.addEventListener('online', () => {
        setTimeout(() => {
          if (!saliendo && navigator.onLine) location.reload();
        }, 1500);
      });

      // Lista de paginas guardadas del mismo idioma, con su <title>, leida de las caches del service worker.
      (async () => {
        if (!('caches' in window)) return;
        const nombres = (await caches.keys()).filter((n) => n.startsWith('encaja-paginas-') || n.startsWith('encaja-shell-'));
        const vistas = new Map();
        for (const nombre of nombres) {
          const cache = await caches.open(nombre);
          for (const peticion of await cache.keys()) {
            const url = new URL(peticion.url);
            if (url.origin !== location.origin || !url.pathname.endsWith('/') || vistas.has(url.pathname) || !delIdioma(url.pathname)) continue;
            const html = await (await cache.match(peticion)).text();
            const titulo = (html.match(/<title>([^<]*)<\\/title>/i)?.[1] ?? url.pathname).replace(/&amp;/g, '&');
            vistas.set(url.pathname, url.pathname === t.home ? t.inicio : titulo.split(' | ')[0]);
          }
        }
        if (!vistas.size) return;
        const lista = document.getElementById('lista');
        for (const [camino, titulo] of [...vistas].sort((a, b) => a[0].localeCompare(b[0]))) {
          const enlace = Object.assign(document.createElement('a'), { href: camino });
          enlace.append(titulo, Object.assign(document.createElement('span'), { textContent: camino }));
          const fila = document.createElement('li');
          fila.append(enlace);
          lista.append(fila);
        }
        document.getElementById('guardadas').hidden = false;
      })().catch(() => {});
    </script>
  </body>
</html>
`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
