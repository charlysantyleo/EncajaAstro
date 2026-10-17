import { useState } from 'react';
import { useOpcionesDeVehiculo } from '../../hooks/useOpcionesDeVehiculo';
import BuscadorDeVehiculo from '../vehiculos/BuscadorDeVehiculo';

const VACIA = { marca: '', modelo: '', anioDesde: '', anioHasta: '', motor: '', tipo: 'DIRECTO', nota: '' };

// "Esta pieza embona en Nissan Versa 2012–2019 (y opcionalmente solo con tal motor)". El modelo sale del
// catalogo de vehiculos, asi le aparece a todo cliente que tenga ese coche.
export default function NuevaCompatibilidad({ onAgregar }) {
  const [nueva, setNueva] = useState(VACIA);
  const [agregando, setAgregando] = useState(false);
  const opciones = useOpcionesDeVehiculo({ marca: nueva.marca, modelo: nueva.modelo });
  // aniosDeVehiculo llega del mas reciente al mas antiguo.
  const anios = [...opciones.anios].sort((a, b) => a - b);
  const primero = anios[0];
  const ultimo = anios.at(-1);

  function elegir(cambios) {
    setNueva((anterior) => {
      const otra = { ...anterior, ...cambios };
      if ('marca' in cambios && cambios.marca !== anterior.marca && !('modelo' in cambios)) otra.modelo = '';
      if (otra.marca !== anterior.marca || otra.modelo !== anterior.modelo) {
        // Si se busco con año ("versa 2018"), el rango empieza y termina ahi; si no, se llena al llegar los años.
        otra.anioDesde = cambios.anio ? String(cambios.anio) : '';
        otra.anioHasta = cambios.anio ? String(cambios.anio) : '';
        otra.motor = '';
      }
      delete otra.anio;
      return otra;
    });
  }

  const desde = nueva.anioDesde || (primero ? String(primero) : '');
  const hasta = nueva.anioHasta || (ultimo ? String(ultimo) : '');
  const lista = nueva.marca && nueva.modelo && desde && hasta;

  async function agregar() {
    setAgregando(true);
    const ok = await onAgregar({
      marca: nueva.marca,
      modelo: nueva.modelo,
      anioDesde: Number(desde),
      anioHasta: Number(hasta),
      motor: nueva.motor || null,
      tipo: nueva.tipo,
      nota: nueva.nota || null,
    });
    setAgregando(false);
    if (ok) setNueva(VACIA);
  }

  return (
    <div className="nueva-compat">
      <BuscadorDeVehiculo etiqueta="Agregar vehículo" placeholder="Busca el modelo: versa, jetta 2016…" onElegir={elegir} />
      <div className="campos-2">
        <select className="input" aria-label="Marca" value={nueva.marca} onChange={(e) => elegir({ marca: e.target.value })}>
          <option value="">Marca…</option>
          {opciones.marcas.map((marca) => (
            <option key={marca}>{marca}</option>
          ))}
        </select>
        <select className="input" aria-label="Modelo" disabled={!nueva.marca} value={nueva.modelo} onChange={(e) => elegir({ modelo: e.target.value })}>
          <option value="">Modelo…</option>
          {opciones.modelos.map((modelo) => (
            <option key={modelo}>{modelo}</option>
          ))}
        </select>
      </div>
      <div className="campos-3">
        <div className="campo">
          <label htmlFor="compat-desde">Desde</label>
          <select id="compat-desde" className="input" disabled={!anios.length} value={desde} onChange={(e) => setNueva({ ...nueva, anioDesde: e.target.value, anioHasta: Number(e.target.value) > Number(hasta) ? e.target.value : hasta })}>
            {anios.map((anio) => (
              <option key={anio}>{anio}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="compat-hasta">Hasta</label>
          <select id="compat-hasta" className="input" disabled={!anios.length} value={hasta} onChange={(e) => setNueva({ ...nueva, anioHasta: e.target.value, anioDesde: desde })}>
            {anios
              .filter((anio) => anio >= Number(desde))
              .map((anio) => (
                <option key={anio}>{anio}</option>
              ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="compat-motor">Motor</label>
          <select id="compat-motor" className="input" disabled={!nueva.modelo} value={nueva.motor} onChange={(e) => setNueva({ ...nueva, motor: e.target.value })}>
            <option value="">Cualquiera</option>
            {opciones.motores.map((motor) => (
              <option key={motor}>{motor}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="editor-compat-nueva">
        <select className="input" aria-label="Tipo de ajuste" value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })}>
          <option value="DIRECTO">Directo</option>
          <option value="EQUIVALENCIA">Equivalencia</option>
        </select>
        <input className="input" aria-label="Nota (opcional)" placeholder="Nota (opcional)" maxLength={200} value={nueva.nota} onChange={(e) => setNueva({ ...nueva, nota: e.target.value })} />
        <button type="button" className="btn btn-secundario btn-chico" disabled={!lista || agregando} onClick={agregar}>
          {lista ? `Agregar ${nueva.modelo} ${desde === hasta ? desde : `${desde}–${hasta}`}` : 'Agregar'}
        </button>
      </div>
    </div>
  );
}
