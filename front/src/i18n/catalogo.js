// Contenido del catalogo en ingles. Los nombres y descripciones viven en la base de datos (en espanol); aqui va su
// traduccion, por slug del sistema y por numero de parte. Una pieza o sistema que no este aqui se muestra en
// espanol (por ejemplo, uno agregado desde el panel despues de este cambio).
import { slug } from '../lib/slug';

const CATEGORIAS = {
  frenos: { nombre: 'Brakes', descripcion: 'Pads, rotors and braking system components' },
  filtros: { nombre: 'Filters', descripcion: 'Oil, air and cabin filters' },
  suspension: { nombre: 'Suspension', descripcion: 'Shocks, springs and steering' },
  motor: { nombre: 'Engine', descripcion: 'Spark plugs, belts and internal components' },
  enfriamiento: { nombre: 'Cooling', descripcion: 'Water pumps, thermostats and hoses' },
  electrico: { nombre: 'Electrical', descripcion: 'Batteries, alternators and lighting' },
};

const PRODUCTOS = {
  'BC-4021': { nombre: 'Front ceramic brake pads', descripcion: 'High-performance front brake pad set, low noise and low dust.' },
  'BC-4099': { nombre: 'Rear semi-metallic brake pads', descripcion: 'Long-lasting rear brake pad set.' },
  'DF-1187': { nombre: 'Vented brake rotor', descripcion: 'Vented front rotor, sold individually.' },
  'FA-0231': { nombre: 'Oil filter', descripcion: 'Spin-on oil filter with anti-drainback valve.' },
  'FA-0450': { nombre: 'Air filter', descripcion: 'High-flow panel air filter.' },
  'FA-0512': { nombre: 'Cabin filter', descripcion: 'Pollen and dust filter for the cabin.' },
  'AM-3301': { nombre: 'Front shock absorber', descripcion: 'Front gas shock absorber, sold individually.' },
  'AM-3302': { nombre: 'Rear shock absorber', descripcion: 'Rear gas shock absorber, sold individually.' },
  'TD-0871': { nombre: 'Tie rod end', descripcion: 'Outer tie rod end for the steering rack.' },
  'BJ-1002': { nombre: 'Iridium spark plug', descripcion: 'Iridium ignition spark plug, sold individually.' },
  'BD-2210': { nombre: 'Timing belt kit', descripcion: 'Timing belt kit with tensioner.' },
  'BA-3120': { nombre: 'Water pump', descripcion: 'Cooling system water pump.' },
  'TM-0044': { nombre: 'Thermostat', descripcion: 'Thermostat with gasket included.' },
  'BT-4500': { nombre: '12V 45Ah battery', descripcion: 'Maintenance-free battery, 12V 45Ah.' },
  'AL-7701': { nombre: 'Remanufactured alternator', descripcion: 'Remanufactured alternator with a one-year warranty.' },
  'FH-0100': { nombre: 'H4 bulb', descripcion: 'H4 halogen bulb, sold in pairs.' },
};

// Notas de compatibilidad que captura el admin (las del catalogo inicial).
const NOTAS = {
  'Ajuste original de fabrica': 'Original factory fit',
  'Cambio recomendado cada 80,000 km': 'Replacement recommended every 80,000 km',
  'Se requieren cuatro piezas': 'Four pieces required',
  'Se requieren dos piezas': 'Two pieces required',
  'Compatible con la misma rosca': 'Compatible with the same thread',
  'Equivale al disco original, verificar espesor minimo': 'Equivalent to the original rotor; check minimum thickness',
  'Misma medida, cambia el sensor de desgaste': 'Same size; the wear sensor changes',
};

const motorEn = (motor) => motor?.replace(/\bcil\./g, 'cyl.') ?? motor;

export function traducirCategoria(categoria, idioma) {
  if (idioma !== 'en' || !categoria?.nombre) return categoria;
  const en = CATEGORIAS[slug(categoria.nombre)];
  if (!en) return categoria;
  return { ...categoria, nombre: en.nombre, descripcion: categoria.descripcion != null ? en.descripcion : categoria.descripcion, nombreOriginal: categoria.nombre };
}

export function traducirCompatibilidad(compatibilidad, idioma) {
  if (idioma !== 'en' || !compatibilidad) return compatibilidad;
  return { ...compatibilidad, nota: NOTAS[compatibilidad.nota] ?? compatibilidad.nota, motor: motorEn(compatibilidad.motor) };
}

export function traducirProducto(producto, idioma) {
  if (idioma !== 'en' || !producto) return producto;
  if (producto.nombreOriginal) return producto; // ya traducido
  const en = PRODUCTOS[producto.numeroParte];
  return {
    ...producto,
    nombreOriginal: producto.nombre,
    nombre: en?.nombre ?? producto.nombre,
    descripcion: producto.descripcion != null ? (en?.descripcion ?? producto.descripcion) : producto.descripcion,
    categoria: traducirCategoria(producto.categoria, idioma),
    compatibilidades: producto.compatibilidades?.map((c) => traducirCompatibilidad(c, idioma)),
  };
}

// Nombre de una linea de la nota (se guarda en el idioma en que se agrego; se muestra en el de la pagina).
export function nombreDeLinea(item, idioma) {
  if (idioma === 'en') return PRODUCTOS[item.numeroParte]?.nombre ?? item.nombre;
  return item.nombreOriginal ?? item.nombre;
}

// Nombre del sistema en ingles a partir del nombre en espanol (o el mismo si ya esta en ingles o no hay traduccion).
export function nombreCategoriaEn(nombre) {
  return CATEGORIAS[slug(nombre ?? '')]?.nombre ?? nombre;
}
