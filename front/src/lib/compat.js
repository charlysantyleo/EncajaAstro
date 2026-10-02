// Que tipo de ajuste tiene una pieza en el vehiculo activo (o null si no consta).
export function ajusteDe(producto, vehiculoId) {
  if (!vehiculoId || !producto?.compatibilidades) return null;
  return producto.compatibilidades.find((c) => c.vehiculo?.id === vehiculoId) ?? null;
}
