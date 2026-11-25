// Producto del build con la forma que espera la lista del catalogo (la misma que trae QUERY_PRODUCTOS).
// En el build no hay sesion: el precio "para ti" es el de lista; el navegador lo pone al dia (mayoreo de taller).
export const paraLista = (p) => ({
  id: p.id,
  nombre: p.nombre,
  // En ingles, el nombre original (espanol) es el que se guarda en la nota.
  ...(p.nombreOriginal ? { nombreOriginal: p.nombreOriginal } : {}),
  numeroParte: p.numeroParte,
  marca: p.marca,
  precio: p.precio,
  precioParaTi: p.precio,
  imagen: p.imagen,
  stock: p.stock,
  categoria: p.categoria,
  compatibilidades: p.compatibilidades,
});
