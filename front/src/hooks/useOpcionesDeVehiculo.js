import {
  QUERY_ANIOS_DE_VEHICULO,
  QUERY_MARCAS_DE_VEHICULOS,
  QUERY_MODELOS_DE_VEHICULOS,
  QUERY_MOTORES_DE_VEHICULO,
} from '../graphql/queries';
import { useGraphQLQuery } from './useGraphQLQuery';

// Listas en cascada del catalogo de vehiculos: marcas -> modelos de la marca -> años del modelo -> motores.
// Sin año, los motores son los de todos los años del modelo (lo que necesita una compatibilidad).
export function useOpcionesDeVehiculo({ marca, modelo, anio }) {
  const conModelo = Boolean(marca && modelo);
  const marcas = useGraphQLQuery(QUERY_MARCAS_DE_VEHICULOS);
  const modelos = useGraphQLQuery(QUERY_MODELOS_DE_VEHICULOS, { marca }, { skip: !marca });
  const anios = useGraphQLQuery(QUERY_ANIOS_DE_VEHICULO, { marca, modelo }, { skip: !conModelo });
  const motores = useGraphQLQuery(QUERY_MOTORES_DE_VEHICULO, { marca, modelo, anio: anio ? Number(anio) : null }, { skip: !conModelo });

  return {
    marcas: marcas.datos?.marcasDeVehiculos ?? [],
    modelos: marca ? (modelos.datos?.modelosDeVehiculos ?? []) : [],
    anios: conModelo ? (anios.datos?.aniosDeVehiculo ?? []) : [],
    motores: conModelo ? [...(motores.datos?.motoresDeVehiculo ?? [])].sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b)) : [],
    cargandoMotores: conModelo && motores.cargando,
    error: marcas.error,
    recargar: marcas.recargar,
  };
}
