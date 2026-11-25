import { useState } from 'react';
import { Loader2 } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { graphqlRequest } from '../graphql/client';
import { MUTATION_AGREGAR_VEHICULO } from '../graphql/queries';
import { useOpcionesDeVehiculo } from '../hooks/useOpcionesDeVehiculo';
import { MOTORES_COMUNES, MOTOR_ELECTRICO } from '../lib/motores';
import Capa from './ui/Capa';
import BuscadorDeVehiculo from './vehiculos/BuscadorDeVehiculo';
import { useT } from '../i18n/react';

const COMBUSTIBLES = [
  ['GASOLINA', 'Gasolina'],
  ['DIESEL', 'Diésel'],
  ['HIBRIDO', 'Híbrido'],
  ['ELECTRICO', 'Eléctrico'],
];

// El coche se elige del catalogo (marca, modelo, año y motor): asi las piezas compatibles lo encuentran.
// Se puede buscar ("versa 2018") o ir eligiendo en las listas.
export default function AgregarVehiculoModal() {
  const ir = useTienda((estado) => estado.ir);
  const elegirVehiculoActivo = useTienda((estado) => estado.elegirVehiculoActivo);
  const refrescar = useTienda((estado) => estado.refrescar);
  const t = useT();

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
  const opciones = useOpcionesDeVehiculo(formulario);

  const esElectrico = formulario.tipoCombustible === 'ELECTRICO';
  // Si el catalogo conoce los motores de ese año, se elige entre ellos; si no, de la lista general.
  const motoresDelCatalogo = formulario.anio ? opciones.motores : [];
  const listo = formulario.marca && formulario.modelo && formulario.anio;

  function actualizar(campo, valor) {
    setFormulario((anterior) => ({ ...anterior, [campo]: valor }));
  }

  // Cambiar algo de arriba borra lo que dependia de ello (otra marca no tiene ese modelo).
  function elegir(cambios) {
    setFormulario((anterior) => {
      const nuevo = { ...anterior, ...cambios };
      if ('marca' in cambios && cambios.marca !== anterior.marca) Object.assign(nuevo, { modelo: cambios.modelo ?? '', anio: cambios.anio ?? '' });
      if ('modelo' in cambios && cambios.modelo !== anterior.modelo) nuevo.anio = cambios.anio ?? '';
      if (nuevo.marca !== anterior.marca || nuevo.modelo !== anterior.modelo || nuevo.anio !== anterior.anio) nuevo.motor = '';
      return nuevo;
    });
  }

  function elegirMotor(motor) {
    // Un motor hibrido o electrico tambien dice el combustible.
    const tipoCombustible = /híbrido/i.test(motor) ? 'HIBRIDO' : motor === MOTOR_ELECTRICO ? 'ELECTRICO' : formulario.tipoCombustible;
    setFormulario((anterior) => ({ ...anterior, motor, tipoCombustible }));
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
    <Capa titulo={t('Agregar vehículo')} onCerrar={() => ir('cerrarModal')}>
      <h3>{t('Agregar vehículo')}</h3>

      <form className="formulario" onSubmit={manejarGuardar}>
        <BuscadorDeVehiculo onElegir={({ marca, modelo, anio }) => elegir({ marca, modelo, anio: anio ? String(anio) : '' })} />

        <fieldset className="grupo-vehiculo">
          <legend className="apagado">{t('O elígelo de la lista')}</legend>
          <div className="campos-3">
            <div className="campo">
              <label htmlFor="vehiculo-marca">{t('Marca')}</label>
              <select id="vehiculo-marca" className="input" required value={formulario.marca} onChange={(e) => elegir({ marca: e.target.value })}>
                <option value="">{t('Elige…')}</option>
                {opciones.marcas.map((marca) => (
                  <option key={marca} value={marca}>
                    {marca}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="vehiculo-modelo">{t('Modelo')}</label>
              <select
                id="vehiculo-modelo"
                className="input"
                required
                disabled={!formulario.marca}
                value={formulario.modelo}
                onChange={(e) => elegir({ modelo: e.target.value })}
              >
                <option value="">{formulario.marca ? t('Elige…') : t('Primero la marca')}</option>
                {opciones.modelos.map((modelo) => (
                  <option key={modelo} value={modelo}>
                    {modelo}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="vehiculo-anio">{t('Año')}</label>
              <select
                id="vehiculo-anio"
                className="input"
                required
                disabled={!formulario.modelo}
                value={formulario.anio}
                onChange={(e) => elegir({ anio: e.target.value })}
              >
                <option value="">{formulario.modelo ? t('Elige…') : t('Primero el modelo')}</option>
                {opciones.anios.map((anio) => (
                  <option key={anio} value={String(anio)}>
                    {anio}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>
        {opciones.error && <p className="error">{t('No se pudo cargar el catálogo de vehículos. Intenta de nuevo.')}</p>}

        <div className="campos-2">
          <div className="campo">
            <label htmlFor="vehiculo-motor">{t('Motor (opcional)')}</label>
            {esElectrico ? (
              <select id="vehiculo-motor" className="input" value={MOTOR_ELECTRICO} disabled>
                <option value={MOTOR_ELECTRICO}>{MOTOR_ELECTRICO}</option>
              </select>
            ) : (
              <select
                id="vehiculo-motor"
                className="input"
                disabled={!listo}
                value={formulario.motor}
                onChange={(evento) => elegirMotor(evento.target.value)}
              >
                <option value="">{t('No lo sé')}</option>
                {motoresDelCatalogo.length > 0
                  ? motoresDelCatalogo.map((motor) => (
                      <option key={motor} value={motor}>
                        {motor}
                      </option>
                    ))
                  : MOTORES_COMUNES.map(([grupo, motores]) => (
                      <optgroup key={grupo} label={t(grupo)}>
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
            <label htmlFor="vehiculo-combustible">{t('Combustible')}</label>
            <select
              id="vehiculo-combustible"
              className="input"
              value={formulario.tipoCombustible}
              onChange={(evento) => actualizar('tipoCombustible', evento.target.value)}
            >
              {COMBUSTIBLES.map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {t(etiqueta)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {listo && !esElectrico && !formulario.motor && (
          <p className="apagado" style={{ margin: 0 }}>
            {t('Si eliges el motor, solo verás las piezas que le quedan a tu versión.')}
          </p>
        )}

        <div className="campos-2">
          <div className="campo">
            <label htmlFor="vehiculo-apodo">{t('Apodo (opcional)')}</label>
            <input
              id="vehiculo-apodo"
              className="input"
              value={formulario.apodo}
              placeholder={t('El azul')}
              onChange={(evento) => actualizar('apodo', evento.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="vehiculo-km">{t('Kilometraje (opcional)')}</label>
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

        <button className="btn btn-primario btn-bloque" type="submit" disabled={guardando || !listo}>
          {guardando ? (
            <>
              <Loader2 size={18} className="girar" /> {t('Guardando…')}
            </>
          ) : listo ? (
            t('Guardar mi {auto}', { auto: `${formulario.modelo} ${formulario.anio}` })
          ) : (
            t('Elige tu vehículo')
          )}
        </button>
        <p className="apagado" style={{ margin: 0, textAlign: 'center' }}>
          {t('¿No aparece? Escríbenos y lo agregamos al catálogo.')}
        </p>
      </form>
    </Capa>
  );
}
