import { Store, Trash2, Truck } from './ui/Iconos';
import { ENTREGAS, direccionEnUnaLinea } from '../lib/entrega';
import { pesos } from '../lib/formato';

const ICONOS = { DOMICILIO: Truck, TIENDA: Store };

// Como se entrega el pedido. Con envio a domicilio se despliega la direccion: las que el comprador
// guardo en su cuenta (si tiene sesion) y el formulario para una nueva. Los campos llevan `autoComplete`
// para que el navegador los rellene. `reglas` viene del servidor: costo del envio y municipios con cobertura.
export default function DatosEntrega({
  tipo,
  onTipo,
  direccion,
  onDireccion,
  reglas,
  guardadas = [],
  elegida,
  onElegir,
  onQuitar,
  conSesion,
  guardar,
  onGuardar,
}) {
  const campo = (nombre) => ({
    id: `entrega-${nombre}`,
    className: 'input',
    value: direccion[nombre],
    onChange: (evento) => onDireccion({ ...direccion, [nombre]: evento.target.value }),
  });

  const descripciones = {
    DOMICILIO: `Zona metropolitana de Guadalajara. ${pesos(reglas.costo)}, gratis en compras desde ${pesos(reglas.gratisDesde)}.`,
    TIENDA: ENTREGAS.TIENDA.descripcion,
  };
  const nueva = elegida === 'nueva';

  return (
    <fieldset className="metodos">
      <legend className="solo-lectores">Entrega</legend>
      {Object.entries(ENTREGAS).map(([clave, textos]) => {
        const elegido = tipo === clave;
        const Icono = ICONOS[clave];
        return (
          <div key={clave} className={elegido ? 'metodo elegido' : 'metodo'}>
            <label className="metodo-fila" htmlFor={`entrega-tipo-${clave}`}>
              <input id={`entrega-tipo-${clave}`} type="radio" name="tipo-entrega" checked={elegido} onChange={() => onTipo(clave)} />
              <span className="metodo-marca" aria-hidden="true" />
              <Icono size={22} />
              <span className="metodo-texto">
                <span className="metodo-titulo">{textos.titulo}</span>
                <span className="metodo-descripcion">{descripciones[clave]}</span>
              </span>
            </label>

            {elegido && clave === 'DOMICILIO' && (
              <div className="metodo-extra direccion">
                {guardadas.length > 0 && (
                  <ul className="direcciones" aria-label="Tus direcciones guardadas">
                    {guardadas.map((guardada) => (
                      <li key={guardada.id} className={elegida === guardada.id ? 'direccion-guardada elegida' : 'direccion-guardada'}>
                        <label htmlFor={`direccion-${guardada.id}`}>
                          <input
                            id={`direccion-${guardada.id}`}
                            type="radio"
                            name="direccion-guardada"
                            checked={elegida === guardada.id}
                            onChange={() => onElegir(guardada.id)}
                          />
                          <span className="metodo-marca" aria-hidden="true" />
                          <span className="metodo-texto">
                            <span>{direccionEnUnaLinea(guardada)}</span>
                            {guardada.referencias && <span className="metodo-descripcion">{guardada.referencias}</span>}
                          </span>
                        </label>
                        <button type="button" className="btn-icono" onClick={() => onQuitar(guardada)} aria-label={`Borrar la dirección ${direccionEnUnaLinea(guardada)}`} title="Borrar de mi cuenta">
                          <Trash2 size={18} />
                        </button>
                      </li>
                    ))}
                    <li className={nueva ? 'direccion-guardada elegida' : 'direccion-guardada'}>
                      <label htmlFor="direccion-nueva">
                        <input id="direccion-nueva" type="radio" name="direccion-guardada" checked={nueva} onChange={() => onElegir('nueva')} />
                        <span className="metodo-marca" aria-hidden="true" />
                        <span className="metodo-texto">Otra dirección</span>
                      </label>
                    </li>
                  </ul>
                )}

                {nueva && (
                  <>
                    <div className="campos-direccion">
                      <div className="campo">
                        <label htmlFor="entrega-calle">Calle</label>
                        <input {...campo('calle')} required maxLength={120} autoComplete="address-line1" />
                      </div>
                      <div className="campo">
                        <label htmlFor="entrega-numeroExterior">Núm. exterior</label>
                        <input {...campo('numeroExterior')} required maxLength={20} autoComplete="off" />
                      </div>
                      <div className="campo">
                        <label htmlFor="entrega-numeroInterior">Núm. interior (opcional)</label>
                        <input {...campo('numeroInterior')} maxLength={20} autoComplete="off" />
                      </div>
                    </div>

                    <div className="campos-2">
                      <div className="campo">
                        <label htmlFor="entrega-colonia">Colonia</label>
                        <input {...campo('colonia')} required maxLength={120} autoComplete="address-level3" />
                      </div>
                      <div className="campo">
                        <label htmlFor="entrega-codigoPostal">Código postal</label>
                        <input
                          {...campo('codigoPostal')}
                          required
                          inputMode="numeric"
                          pattern="[0-9]{5}"
                          maxLength={5}
                          title="5 dígitos"
                          autoComplete="postal-code"
                        />
                      </div>
                    </div>

                    <div className="campos-2">
                      <div className="campo">
                        <label htmlFor="entrega-ciudad">Municipio</label>
                        <select {...campo('ciudad')} required autoComplete="address-level2">
                          <option value="" disabled>
                            Elige tu municipio
                          </option>
                          {reglas.municipios.map((municipio) => (
                            <option key={municipio} value={municipio}>
                              {municipio}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="campo">
                        <label htmlFor="entrega-estado">Estado</label>
                        <input id="entrega-estado" className="input" value={reglas.estado} readOnly tabIndex={-1} aria-describedby="entrega-cobertura" />
                      </div>
                    </div>
                    <p id="entrega-cobertura" className="apagado" style={{ margin: 0 }}>
                      Por ahora solo enviamos a la zona metropolitana de Guadalajara. Si estás fuera, puedes recoger en mostrador.
                    </p>

                    <div className="campo">
                      <label htmlFor="entrega-referencias">Referencias para encontrar el domicilio (opcional)</label>
                      <textarea {...campo('referencias')} maxLength={300} rows={2} placeholder="Entre qué calles, color de la fachada, quién recibe…" />
                    </div>

                    {conSesion && (
                      <label className="casilla" htmlFor="entrega-guardar">
                        <input id="entrega-guardar" type="checkbox" checked={guardar} onChange={(evento) => onGuardar(evento.target.checked)} />
                        Guardar esta dirección en mi cuenta
                      </label>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
