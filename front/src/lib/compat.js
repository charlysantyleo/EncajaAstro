// Compatibilidades por rango: "embona en Nissan Versa 2012–2019" (y quiza "solo con motor 1.6L 4 cil.").
// Misma regla que back/src/dominio/vehiculos.js (cubre).
const igual = (a, b) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

export function cubre(compatibilidad, vehiculo) {
  return (
    igual(compatibilidad.marca, vehiculo.marca) &&
    igual(compatibilidad.modelo, vehiculo.modelo) &&
    vehiculo.anio >= compatibilidad.anioDesde &&
    vehiculo.anio <= compatibilidad.anioHasta &&
    (!compatibilidad.motor || igual(compatibilidad.motor, vehiculo.motor))
  );
}

// Que tipo de ajuste tiene una pieza en el vehiculo activo (o null si no consta). Si hay una compatibilidad
// para su motor y otra general, gana la de su motor.
export function ajusteDe(producto, vehiculo) {
  if (!vehiculo || !producto?.compatibilidades) return null;
  const aplican = producto.compatibilidades.filter((c) => cubre(c, vehiculo));
  return aplican.find((c) => c.motor) ?? aplican[0] ?? null;
}

export const anios = (c) => (c.anioDesde === c.anioHasta ? `${c.anioDesde}` : `${c.anioDesde}–${c.anioHasta}`);

// "Nissan Versa 2012–2019 · 1.6L 4 cil."
export const describir = (c) => `${c.marca} ${c.modelo} ${anios(c)}${c.motor ? ` · ${c.motor}` : ''}`;
