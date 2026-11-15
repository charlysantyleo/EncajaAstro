// robots.txt generado en el build: la linea Sitemap debe ser una URL absoluta, y depende de donde se publica.
const PRIVADAS = ['/admin', '/carrito', '/checkout', '/pago', '/comprobante', '/entrar', '/restablecer', '/garage', '/vehiculo'];

export function GET({ site }) {
  const texto = [
    '# EnCaja Autopartes',
    'User-agent: *',
    'Allow: /',
    '# Paginas de cada visitante (sesion, nota, pedidos) y el panel: no aportan nada en un buscador.',
    ...PRIVADAS.map((ruta) => `Disallow: ${ruta}`),
    '',
    `Sitemap: ${new URL('/sitemap-index.xml', site).href}`,
    '',
  ].join('\n');
  return new Response(texto, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
