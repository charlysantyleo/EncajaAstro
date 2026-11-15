// URLs limpias: "Balatas delanteras ceramicas" + "BC-4021" -> "bc-4021-balatas-delanteras-ceramicas".
// La misma funcion la usan las paginas que se generan en el build y los enlaces del navegador.
export function slug(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const slugDeCategoria = (categoria) => slug(categoria.nombre);
// El numero de parte va primero: es unico, asi dos piezas con el mismo nombre no chocan.
export const slugDeProducto = (producto) => slug(`${producto.numeroParte} ${producto.nombre}`);
