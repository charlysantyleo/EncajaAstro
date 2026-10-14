import { useState } from 'react';
import { Loader2 } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { graphqlRequest } from '../graphql/client';
import { MUTATION_AGREGAR_VEHICULO } from '../graphql/queries';
import Capa from './ui/Capa';

const COMBUSTIBLES = [
  ['GASOLINA', 'Gasolina'],
  ['DIESEL', 'Diésel'],
  ['HIBRIDO', 'Híbrido'],
  ['ELECTRICO', 'Eléctrico'],
];

// Motores mas comunes, por cilindrada y numero de cilindros. Es una lista y no texto libre para que
// el mismo motor no quede escrito de diez maneras ("1.6", "1.6 L", "1600cc").
const MOTORES = [
  ['4 cilindros o menos', ['1.0L 3 cil.', '1.2L 3 cil.', '1.2L 4 cil.', '1.4L 4 cil.', '1.5L 3 cil.', '1.5L 4 cil.', '1.6L 4 cil.', '1.8L 4 cil.', '2.0L 4 cil.', '2.4L 4 cil.', '2.5L 4 cil.', '2.7L 4 cil.']],
  ['5 y 6 cilindros', ['2.5L 5 cil.', '3.0L V6', '3.5L V6', '3.6L V6', '4.0L V6']],
  ['8 cilindros', ['5.0L V8', '5.3L V8', '5.7L V8']],
];
// Un auto electrico no tiene cilindrada: su motor se anota solo.
const MOTOR_ELECTRICO = 'Eléctrico';

export default function AgregarVehiculoModal() {
  const ir = useTienda((estado) => estado.ir);
  const elegirVehiculoActivo = useTienda((estado) => estado.elegirVehiculoActivo);
  const refrescar = useTienda((estado) => estado.refrescar);

  const [formulario, setFormulario] = useState({
    apodo: '',
    marca: '',
    modelo: '',
    anio: '',
    motor: '',
    tipoCombustible: 'GASOLINA',
    kilometraje: '',
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const esElectrico = formulario.tipoCombustible === 'ELECTRICO';

  function actualizar(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  async function manejarGuardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const datos = await graphqlRequest(MUTATION_AGREGAR_VEHICULO, {
        datos: {
          apodo: formulario.apodo || null,
          marca: formulario.marca,
          modelo: formulario.modelo,
          anio: Number(formulario.anio),
          motor: esElectrico ? MOTOR_ELECTRICO : formulario.motor || null,
          tipoCombustible: formulario.tipoCombustible,
          kilometraje: formulario.kilometraje ? Number(formulario.kilometraje) : null,
        },
      });
      refrescar();
      elegirVehiculoActivo(datos.agregarVehiculo);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <Capa titulo="Agregar vehículo" onCerrar={() => ir('cerrarModal')}>
      <h3>Agregar vehículo</h3>

      <form className="formulario" onSubmit={manejarGuardar}>
        <div className="campo">
          <label htmlFor="vehiculo-apodo">Apodo (opcional)</label>
          <input
            id="vehiculo-apodo"
            className="input"
            value={formulario.apodo}
            placeholder="El azul"
            onChange={(evento) => actualizar('apodo', evento.target.value)}
          />
        </div>

        <div className="campos-2">
          <div className="campo">
            <label htmlFor="vehiculo-marca">Marca</label>
            <input
              id="vehiculo-marca"
              className="input"
              required
              value={formulario.marca}
              onChange={(evento) => actualizar('marca', evento.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="vehiculo-modelo">Modelo</label>
            <input
              id="vehiculo-modelo"
              className="input"
              required
              value={formulario.modelo}
              onChange={(evento) => actualizar('modelo', evento.target.value)}
            />
          </div>
        </div>

        <div className="campos-2">
          <div className="campo">
            <label htmlFor="vehiculo-anio">Año</label>
            <input
              id="vehiculo-anio"
              className="input"
              required
              type="number"
              inputMode="numeric"
              value={formulario.anio}
              onChange={(evento) => actualizar('anio', evento.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="vehiculo-combustible">Combustible</label>
            <select
              id="vehiculo-combustible"
              className="input"
              value={formulario.tipoCombustible}
              onChange={(evento) => actualizar('tipoCombustible', evento.target.value)}
            >
              {COMBUSTIBLES.map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="campos-2">
          <div className="campo">
            <label htmlFor="vehiculo-motor">Motor (opcional)</label>
            {esElectrico ? (
              <select id="vehiculo-motor" className="input" value={MOTOR_ELECTRICO} disabled>
                <option value={MOTOR_ELECTRICO}>{MOTOR_ELECTRICO}</option>
              </select>
            ) : (
              <select
                id="vehiculo-motor"
                className="input"
                value={formulario.motor}
                onChange={(evento) => actualizar('motor', evento.target.value)}
              >
                <option value="">No lo sé</option>
                {MOTORES.map(([grupo, motores]) => (
                  <optgroup key={grupo} label={grupo}>
                    {motores.map((motor) => (
                      <option key={motor} value={motor}>
                        {motor}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>
          <div className="campo">
            <label htmlFor="vehiculo-km">Kilometraje (opcional)</label>
            <input
              id="vehiculo-km"
              className="input"
              type="number"
              inputMode="numeric"
              value={formulario.kilometraje}
              onChange={(evento) => actualizar('kilometraje', evento.target.value)}
            />
          </div>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <button className="btn btn-primario btn-bloque" type="submit" disabled={guardando}>
          {guardando ? (
            <>
              <Loader2 size={18} className="girar" /> Guardando…
            </>
          ) : (
            'Guardar y usar este vehículo'
          )}
        </button>
      </form>
    </Capa>
  );
}
