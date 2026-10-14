import { CreditCard, Link, Package, Store } from './ui/Iconos';
import { METODOS, PROVEEDORES, TIENDAS } from '../lib/pagos';
import { Cargando } from './EstadoCarga';

const ICONOS = { TARJETA: CreditCard, TIENDA: Store, LINK: Link, PICKUP: Package };
const ORDEN = ['TARJETA', 'TIENDA', 'LINK', 'PICKUP'];

// Primera forma de pago que se puede usar, para dejarla elegida al abrir el checkout.
// `bloqueados` son metodos que la entrega elegida no admite: { PICKUP: 'motivo' }.
export function eleccionInicial(opciones, bloqueados = {}) {
  const primera = ORDEN.filter((metodo) => !bloqueados[metodo])
    .map((metodo) => opciones.find((opcion) => opcion.metodo === metodo && opcion.disponible))
    .find(Boolean);
  return primera ? { metodo: primera.metodo, proveedor: primera.proveedor, tienda: 'OXXO' } : null;
}

function Subopciones({ etiqueta, opciones, valor, onCambio }) {
  return (
    <div className="metodo-extra" role="radiogroup" aria-label={etiqueta}>
      <span className="apagado">{etiqueta}</span>
      <div className="filtros" style={{ marginBottom: 0 }}>
        {opciones.map(([clave, texto]) => (
          <button
            key={clave}
            type="button"
            role="radio"
            aria-checked={valor === clave}
            className={valor === clave ? 'chip activo' : 'chip'}
            onClick={() => onCambio(clave)}
          >
            {texto}
          </button>
        ))}
      </div>
    </div>
  );
}

// Formas de pago del checkout. `opciones` viene del servidor (opcionesDePago): un metodo sin pasarela
// configurada se muestra apagado con su motivo en vez de fallar al confirmar.
// `bloqueados` apaga igual, con su propio motivo, los metodos que no van con la entrega elegida.
// `children` es lo que se despliega bajo el metodo elegido (el formulario de la tarjeta).
export default function MetodosPago({ opciones, cargando, valor, onCambio, bloqueados = {}, children }) {
  if (cargando) return <Cargando filas={4} alto={64} />;

  return (
    <fieldset className="metodos">
      <legend className="solo-lectores">Forma de pago</legend>
      {ORDEN.map((metodo) => {
        const delMetodo = opciones.filter((opcion) => opcion.metodo === metodo);
        const disponibles = delMetodo.filter((opcion) => opcion.disponible);
        if (delMetodo.length === 0) return null;

        const usable = disponibles.length > 0 && !bloqueados[metodo];
        const motivo = bloqueados[metodo] ?? delMetodo[0].motivo;
        const elegido = valor?.metodo === metodo;
        const Icono = ICONOS[metodo];
        const id = `metodo-${metodo}`;

        return (
          <div key={metodo} className={['metodo', elegido ? 'elegido' : '', usable ? '' : 'apagada'].filter(Boolean).join(' ')}>
            <label className="metodo-fila" htmlFor={id}>
              <input
                id={id}
                type="radio"
                name="metodo-pago"
                checked={elegido}
                disabled={!usable}
                onChange={() => onCambio({ metodo, proveedor: disponibles[0].proveedor, tienda: valor?.tienda ?? 'OXXO' })}
              />
              <span className="metodo-marca" aria-hidden="true" />
              <Icono size={22} />
              <span className="metodo-texto">
                <span className="metodo-titulo">{METODOS[metodo].titulo}</span>
                <span className="metodo-descripcion">{usable ? METODOS[metodo].descripcion : `No disponible. ${motivo}.`}</span>
              </span>
            </label>

            {elegido && metodo === 'TIENDA' && (
              <Subopciones
                etiqueta="¿Dónde vas a pagar?"
                opciones={Object.entries(TIENDAS)}
                valor={valor.tienda}
                onCambio={(tienda) => onCambio({ ...valor, tienda })}
              />
            )}

            {elegido && metodo === 'LINK' && disponibles.length > 1 && (
              <Subopciones
                etiqueta="Generar el link con"
                opciones={disponibles.map((opcion) => [opcion.proveedor, PROVEEDORES[opcion.proveedor]])}
                valor={valor.proveedor}
                onCambio={(proveedor) => onCambio({ ...valor, proveedor })}
              />
            )}

            {elegido && metodo === 'LINK' && disponibles.length === 1 && (
              <p className="metodo-extra apagado">El link se genera con {PROVEEDORES[disponibles[0].proveedor]}.</p>
            )}

            {elegido && children && <div className="metodo-extra">{children}</div>}
          </div>
        );
      })}
    </fieldset>
  );
}
