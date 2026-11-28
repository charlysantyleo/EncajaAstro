import { useEffect, useId, useState } from 'react';
import { Search } from '../ui/Iconos';
import { graphqlRequest } from '../../graphql/client';
import { QUERY_BUSCAR_VEHICULOS } from '../../graphql/queries';
import { useT } from '../../i18n/react';

const ESPERA_MS = 250;

// Buscador del catalogo de vehiculos: "versa" o "nissan versa 2018". Al elegir un resultado avisa con
// { marca, modelo, anio } (anio es null si no se escribio un año).
export default function BuscadorDeVehiculo({ onElegir, etiqueta, placeholder }) {
  const t = useT();
  const id = useId();
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const limpio = texto.trim();
    if (limpio.length < 2) {
      setResultados([]);
      setBuscando(false);
      return undefined;
    }
    let vigente = true;
    setBuscando(true);
    const espera = setTimeout(() => {
      graphqlRequest(QUERY_BUSCAR_VEHICULOS, { texto: limpio, limite: 8 })
        .then((datos) => {
          if (!vigente) return;
          setResultados(datos.buscarVehiculos);
          setError(null);
        })
        .catch((err) => {
          if (vigente) setError(err.message);
        })
        .finally(() => {
          if (vigente) setBuscando(false);
        });
    }, ESPERA_MS);
    return () => {
      vigente = false;
      clearTimeout(espera);
    };
  }, [texto]);

  function elegir(resultado) {
    onElegir({ marca: resultado.marca, modelo: resultado.modelo, anio: resultado.anio });
    setTexto('');
    setResultados([]);
  }

  const sinResultados = texto.trim().length >= 2 && !buscando && !error && resultados.length === 0;

  return (
    <div className="campo buscador-vehiculo">
      <label htmlFor={id}>{etiqueta ?? t('vehiculo.buscarEtiqueta')}</label>
      <div className="buscador">
        <Search size={18} />
        <input
          id={id}
          className="input"
          type="search"
          autoComplete="off"
          placeholder={placeholder ?? t('vehiculo.buscarEjemplo')}
          value={texto}
          aria-describedby={`${id}-estado`}
          onChange={(evento) => setTexto(evento.target.value)}
        />
      </div>
      <p id={`${id}-estado`} className="solo-lectores" aria-live="polite">
        {buscando ? t('vehiculo.buscando') : texto.trim().length >= 2 ? t('vehiculo.resultados', { n: resultados.length }) : ''}
      </p>
      {resultados.length > 0 && (
        <ul className="resultados-vehiculo">
          {resultados.map((resultado) => (
            <li key={`${resultado.marca}|${resultado.modelo}`}>
              <button type="button" onClick={() => elegir(resultado)}>
                <span>
                  {resultado.marca} {resultado.modelo}
                  {resultado.anio ? ` ${resultado.anio}` : ''}
                </span>
                {!resultado.anio && (
                  <span className="mono apagado">
                    {resultado.desde === resultado.hasta ? resultado.desde : `${resultado.desde}–${resultado.hasta}`}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {sinResultados && <p className="apagado" style={{ margin: 0 }}>{t('vehiculo.noEncontrado')}</p>}
      {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
    </div>
  );
}
