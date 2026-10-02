export const IMAGENES = {
  "BC-4021": "/img/placa/4021.webp",
  "BC-4099": "/img/placa/bc4099.webp",
  "DF-1187": "/img/placa/df1187.webp",
  "FA-0231": "/img/placa/fa0231.webp",
  "FA-0450": "/img/placa/fa0450.webp",
  "AM-3301": "/img/placa/3301.webp",
  "AM-3302": "/img/placa/am3302.webp",
  "BJ-1002": "/img/placa/bj1002.webp",
  "BD-2210": "/img/placa/bd2210.webp",
  "BA-3120": "/img/placa/ba3120.webp",
  "BT-4500": "/img/placa/bt4500.webp",
  "FH-0100": "/img/placa/fh0100.webp",
  "AL-7701": "/img/placa/al7701.webp",
  "TM-0044": "/img/placa/tm0044.webp",
  "FA-0512": "/img/placa/fa0512.webp",
  "TD-0871": "/img/placa/td0871.webp",
};

export function imagenDe(producto) {
  if (!producto) return null;
  return IMAGENES[producto.numeroParte] ?? producto.imagen ?? null;
}
