import { useGraphQLQuery } from './useGraphQLQuery';
import { useTienda } from '../store/useTienda';
import { useStockEnVivo } from '../store/useStockEnVivo';
import {
  QUERY_CATEGORIAS,
  QUERY_PRODUCTOS,
  QUERY_PRODUCTO,
  QUERY_VEHICULOS,
  QUERY_VEHICULO,
  QUERY_PEDIDOS,
} from '../graphql/queries';

export function useCategorias() {
  const version = useTienda((estado) => estado.version);
  const { datos, cargando, error, recargar } = useGraphQLQuery(QUERY_CATEGORIAS, {}, { version });
  return { categorias: datos?.categorias ?? [], cargando, error, recargar };
}

export function useProductos({ categoriaId, vehiculoId, texto, soloDirectos, limite } = {}) {
  const version = useTienda((estado) => estado.version);
  const stockEnVivo = useStockEnVivo((estado) => estado.stock);
  const { datos, cargando, error, recargar } = useGraphQLQuery(
    QUERY_PRODUCTOS,
    {
      categoriaId: categoriaId ?? null,
      vehiculoId: vehiculoId ?? null,
      texto: texto || null,
      soloDirectos: Boolean(soloDirectos),
      limite: limite ?? null,
    },
    { version }
  );
  const productos = (datos?.productos ?? []).map((producto) =>
    stockEnVivo[producto.id] != null ? { ...producto, stock: stockEnVivo[producto.id] } : producto
  );
  return { productos, cargando, error, recargar };
}

export function useProducto(productoId) {
  const version = useTienda((estado) => estado.version);
  const stockEnVivo = useStockEnVivo((estado) => estado.stock);
  const { datos, cargando, error, recargar } = useGraphQLQuery(
    QUERY_PRODUCTO,
    { id: productoId },
    { skip: !productoId, version }
  );
  const producto = datos?.producto
    ? stockEnVivo[datos.producto.id] != null
      ? { ...datos.producto, stock: stockEnVivo[datos.producto.id] }
      : datos.producto
    : null;
  return { producto, cargando, error, recargar };
}

export function useVehiculos(usuarioId) {
  const version = useTienda((estado) => estado.version);
  const { datos, cargando, error, recargar } = useGraphQLQuery(
    QUERY_VEHICULOS,
    { usuarioId: usuarioId ?? null },
    { skip: !usuarioId, version }
  );
  return { vehiculos: datos?.vehiculos ?? [], cargando, error, recargar };
}

export function useVehiculo(vehiculoId) {
  const version = useTienda((estado) => estado.version);
  const { datos, cargando, error, recargar } = useGraphQLQuery(
    QUERY_VEHICULO,
    { id: vehiculoId },
    { skip: !vehiculoId, version }
  );
  return { vehiculo: datos?.vehiculo ?? null, cargando, error, recargar };
}

export function usePedidos(usuarioId) {
  const version = useTienda((estado) => estado.version);
  const { datos, cargando, error, recargar } = useGraphQLQuery(
    QUERY_PEDIDOS,
    { usuarioId: usuarioId ?? null },
    { skip: !usuarioId, version }
  );
  return { pedidos: datos?.pedidos ?? [], cargando, error, recargar };
}
