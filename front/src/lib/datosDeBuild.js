// Datos que se piden al backend DURANTE EL BUILD (getStaticPaths) para generar el HTML de las paginas de
// categoria y de producto (SSG). El navegador no usa este archivo: en la tienda los datos llegan por GraphQL.
// En Render el plan gratuito "duerme" el servidor: la primera peticion puede tardar casi un minuto, por eso
// se reintenta con calma antes de rendirse.
const API = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/graphql';
const INTENTOS = 5;
const ESPERA_MS = 90_000;

async function consultar(query) {
  let ultimo;
  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      const respuesta = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(ESPERA_MS),
      });
      const resultado = await respuesta.json();
      if (resultado.errors?.length) throw new Error(resultado.errors[0].message);
      return resultado.data;
    } catch (error) {
      ultimo = error;
      if (intento < INTENTOS) await new Promise((listo) => setTimeout(listo, 3000 * intento));
    }
  }
  throw new Error(`No se pudo leer el catálogo de ${API} para generar las páginas: ${ultimo?.message}. ¿Está corriendo el backend?`);
}

// Una sola consulta por build: categorias y productos con lo que necesitan sus paginas.
let catalogo = null;
export function catalogoDeBuild() {
  catalogo ??= consultar(`{
    categorias { id nombre descripcion }
    productos {
      id nombre descripcion numeroParte marca precio imagen stock
      categoria { id nombre }
      compatibilidades { tipo nota marca modelo anioDesde anioHasta motor }
    }
  }`);
  return catalogo;
}
