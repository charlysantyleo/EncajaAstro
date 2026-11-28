// robots.txt generado en el build: la linea Sitemap debe ser una URL absoluta, y depende de donde se publica.
import { IDIOMAS } from '../i18n';
import { rutasPara } from '../lib/rutas';

// Paginas de cada visitante (sesion, pedidos) y el panel, solo en el idioma base; y la nota de cada idioma.
const PRIVADAS = ['/admin', '/checkout', '/pago', '/comprobante', '/entrar', '/restablecer', '/garage', '/vehiculo', '/offline.html'];

export function GET({ site }) {
  const notas = IDIOMAS.map((idioma) => rutasPara(idioma).carrito);
  const texto = [
    '# EnCaja Autopartes',
    'User-agent: *',
    'Allow: /',
    '# Paginas de cada visitante (sesion, nota, pedidos) y el panel: no aportan nada en un buscador.',
    ...[...PRIVADAS, ...notas].map((ruta) => `Disallow: ${ruta}`),
    '',
    `Sitemap: ${new URL('/sitemap-index.xml', site).href}`,
    '',
  ].join('\n');
  return new Response(texto, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
