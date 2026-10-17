// Casos de uso del catalogo de vehiculos: buscar y elegir marca, modelo, año y motor (publico),
// y completarlo o corregirlo desde el panel (solo ADMIN). Los datos importados vienen de INEGI, NHTSA
// y FuelEconomy.gov (scripts/vehiculos/armar-catalogo.js).
import { exigirAdmin } from '../dominio/permisos.js';
import { validarModeloDelCatalogo, validarRangoDeAnios, vehiculoSegunCatalogo } from '../dominio/vehiculos.js';

const RESULTADOS_POR_DEFECTO = 8;
const RESULTADOS_MAXIMOS = 30;

/**
 * @param {{ repos: import('../puertos/salida.js').Repositorios }} puertos
 */
export function crearVehiculos({ repos }) {
  const catalogo = repos.catalogoVehiculos;

  return {
    marcas: (anio) => catalogo.marcas(anio ?? null),
    modelos: (marca, anio) => catalogo.modelos(marca, anio ?? null),
    anios: (marca, modelo) => catalogo.anios(marca, modelo),
    motores: (marca, modelo, anio) => catalogo.motores(marca, modelo, anio ?? null),

    // "versa 2018" -> Nissan Versa en 2018; "versa" -> Nissan Versa con su primer y ultimo año.
    buscar(texto, limite) {
      const palabras = (texto ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 6);
      const anio = palabras.map(Number).find((n) => Number.isInteger(n) && n >= 1900 && n <= 2100) ?? null;
      const terminos = palabras
        .filter((p) => Number(p) !== anio)
        .map((p) => `%${p.replace(/[%_\\]/g, '')}%`)
        .filter((t) => t !== '%%');
      if (!terminos.length) return [];
      return catalogo.buscar({
        terminos,
        inicio: terminos[0].slice(1),
        anio,
        limite: Math.min(Math.max(limite ?? RESULTADOS_POR_DEFECTO, 1), RESULTADOS_MAXIMOS),
      });
    },

    // Para el panel: los modelos de una marca, cada uno con sus años y motores.
    async deMarca(marca) {
      const porModelo = new Map();
      for (const fila of await catalogo.deMarca(marca)) {
        const modelo = porModelo.get(fila.modelo) ?? { marca: fila.marca, modelo: fila.modelo, anios: [] };
        modelo.anios.push(fila);
        porModelo.set(fila.modelo, modelo);
      }
      return [...porModelo.values()];
    },

    async guardar(actor, datos) {
      exigirAdmin(actor);
      return catalogo.guardar(validarModeloDelCatalogo(datos));
    },

    async quitar(actor, { marca, modelo, anioDesde, anioHasta }) {
      exigirAdmin(actor);
      validarRangoDeAnios(anioDesde, anioHasta);
      return catalogo.quitar({ marca, modelo, anioDesde, anioHasta });
    },
  };
}

// Lo usa el garage al agregar o editar un coche: lo busca en el catalogo y lo guarda con sus nombres.
// Mientras el catalogo este vacio (base sin "npm run db:vehiculos") se acepta lo que escriba el usuario.
export async function segunCatalogo(repos, datos) {
  if (!(await repos.catalogoVehiculos.hayDatos())) return datos;
  const delCatalogo = await repos.catalogoVehiculos.buscarUno(datos.marca?.trim() ?? '', datos.modelo?.trim() ?? '', datos.anio);
  return { ...datos, ...vehiculoSegunCatalogo(datos, delCatalogo) };
}
