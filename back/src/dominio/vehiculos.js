// Reglas del catalogo de vehiculos y de las compatibilidades.
//
// El catalogo es la lista compartida de marca, modelo, año y motores que se venden en Mexico; el garage de cada
// usuario elige su coche de ahi. Una compatibilidad no apunta al coche de nadie: dice "esta pieza embona en
// Nissan Versa 2012–2019" (y opcionalmente "solo con el motor 1.6L"), asi que le aparece a todos los que
// tengan ese coche sin capturarla una vez por cliente.
import { ErrorDeNegocio } from './errores.js';

export const ANIO_MINIMO = 1950;
export const anioMaximo = () => new Date().getFullYear() + 1;
// Un auto electrico no tiene cilindrada: su motor se anota solo.
export const MOTOR_ELECTRICO = 'Eléctrico';

const igual = (a, b) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

// La compatibilidad cubre al vehiculo si es la misma marca y modelo, el año cae en el rango y, cuando la
// compatibilidad pide un motor, el vehiculo tiene ese motor. Es la misma regla que aplica el SQL de los repositorios.
export function cubre(compatibilidad, vehiculo) {
  return (
    igual(compatibilidad.marca, vehiculo.marca) &&
    igual(compatibilidad.modelo, vehiculo.modelo) &&
    vehiculo.anio >= compatibilidad.anioDesde &&
    vehiculo.anio <= compatibilidad.anioHasta &&
    (!compatibilidad.motor || igual(compatibilidad.motor, vehiculo.motor))
  );
}

// Dos compatibilidades chocan si son de la misma pieza, modelo y motor, y sus años se enciman.
export function seEnciman(a, b) {
  return (
    igual(a.marca, b.marca) &&
    igual(a.modelo, b.modelo) &&
    igual(a.motor, b.motor) &&
    a.anioDesde <= b.anioHasta &&
    b.anioDesde <= a.anioHasta
  );
}

function texto(valor, campo, maximo = 60) {
  const limpio = (valor ?? '').trim().replace(/\s+/g, ' ');
  if (!limpio) throw new ErrorDeNegocio(`Falta ${campo}`);
  if (limpio.length > maximo) throw new ErrorDeNegocio(`${campo[0].toUpperCase()}${campo.slice(1)} es demasiado largo`);
  return limpio;
}

export function validarRangoDeAnios(anioDesde, anioHasta) {
  const maximo = anioMaximo();
  for (const anio of [anioDesde, anioHasta]) {
    if (!Number.isInteger(anio) || anio < ANIO_MINIMO || anio > maximo) {
      throw new ErrorDeNegocio(`Los años deben estar entre ${ANIO_MINIMO} y ${maximo}`);
    }
  }
  if (anioDesde > anioHasta) throw new ErrorDeNegocio('El año inicial no puede ser mayor que el final');
}

export function validarCompatibilidad(datos) {
  validarRangoDeAnios(datos.anioDesde, datos.anioHasta);
  return {
    marca: texto(datos.marca, 'la marca'),
    modelo: texto(datos.modelo, 'el modelo'),
    anioDesde: datos.anioDesde,
    anioHasta: datos.anioHasta,
    motor: datos.motor?.trim() ? texto(datos.motor, 'el motor', 40) : null,
  };
}

// Lo que el panel agrega al catalogo: un modelo para un rango de años, con sus motores (pueden ir vacios).
export function validarModeloDelCatalogo(datos) {
  validarRangoDeAnios(datos.anioDesde, datos.anioHasta);
  if (datos.anioHasta - datos.anioDesde > 60) throw new ErrorDeNegocio('El rango de años es demasiado amplio');
  const motores = [...new Set((datos.motores ?? []).map((m) => m.trim().replace(/\s+/g, ' ')).filter(Boolean))];
  if (motores.some((m) => m.length > 40)) throw new ErrorDeNegocio('El nombre de un motor es demasiado largo');
  return {
    marca: texto(datos.marca, 'la marca'),
    modelo: texto(datos.modelo, 'el modelo'),
    anioDesde: datos.anioDesde,
    anioHasta: datos.anioHasta,
    motores,
  };
}

// El coche de un usuario tiene que existir en el catalogo; se guarda con los nombres del catalogo para que
// "nissan versa" y "Nissan Versa" sean el mismo coche al buscar piezas. Si el catalogo conoce los motores de
// ese modelo y año, el motor elegido debe ser uno de ellos.
export function vehiculoSegunCatalogo(datos, delCatalogo) {
  if (!delCatalogo) {
    throw new ErrorDeNegocio(
      `No encontramos ${datos.marca} ${datos.modelo} ${datos.anio} en el catálogo. Búscalo de nuevo o pide a la tienda que lo agregue.`
    );
  }
  const motor = datos.motor?.trim() || null;
  if (motor && motor !== MOTOR_ELECTRICO && delCatalogo.motores.length && !delCatalogo.motores.some((m) => igual(m, motor))) {
    throw new ErrorDeNegocio(`El ${delCatalogo.marca} ${delCatalogo.modelo} ${delCatalogo.anio} no viene con motor ${motor}`);
  }
  return {
    marca: delCatalogo.marca,
    modelo: delCatalogo.modelo,
    anio: delCatalogo.anio,
    motor: motor && (delCatalogo.motores.find((m) => igual(m, motor)) ?? motor),
  };
}
