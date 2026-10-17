import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from '../ui/Iconos';
import { graphqlRequest } from '../../graphql/client';
import {
  MUTATION_GUARDAR_MODELO_DE_VEHICULO,
  MUTATION_QUITAR_MODELO_DE_VEHICULO,
  QUERY_CATALOGO_DE_MARCA,
  QUERY_MARCAS_DE_VEHICULOS,
} from '../../graphql/queries';
import { useGraphQLQuery } from '../../hooks/useGraphQLQuery';
import { Cargando, ErrorConReintento } from '../EstadoCarga';
import { comoIsla } from '../ui/Isla';
import BuscadorDeVehiculo from '../vehiculos/BuscadorDeVehiculo';

const VACIO = { marca: '', modelo: '', anioDesde: '', anioHasta: '', motores: '' };

// "2005, 2006, 2007, 2010" -> "2005–2007, 2010"
function tramos(anios) {
  const ordenados = [...anios].sort((a, b) => a - b);
  const partes = [];
  for (let i = 0; i < ordenados.length; i++) {
    const inicio = ordenados[i];
    while (ordenados[i + 1] === ordenados[i] + 1) i++;
    partes.push(inicio === ordenados[i] ? `${inicio}` : `${inicio}–${ordenados[i]}`);
  }
  return partes.join(', ');
}

const motoresDe = (modelo) => [...new Set(modelo.anios.flatMap((a) => a.motores))].sort((a, b) => parseFloat(a) - parseFloat(b) || a.localeCompare(b));

// Catalogo de vehiculos (solo ADMIN). Lo importado viene de INEGI, NHTSA y FuelEconomy.gov; aqui se agrega
// lo que falte (modelos que solo se venden en Mexico, años o motores) y se corrige lo que este mal.
function VehiculosAdmin() {
  const marcas = useGraphQLQuery(QUERY_MARCAS_DE_VEHICULOS);
  const [marca, setMarca] = useState('');
  const [filtro, setFiltro] = useState('');
  const [version, setVersion] = useState(0);
  const catalogo = useGraphQLQuery(QUERY_CATALOGO_DE_MARCA, { marca }, { skip: !marca, version });
  const [formulario, setFormulario] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);

  const listaDeMarcas = marcas.datos?.marcasDeVehiculos ?? [];
  useEffect(() => {
    if (!marca && listaDeMarcas.includes('Nissan')) setMarca('Nissan');
  }, [marca, listaDeMarcas]);

  const modelos = useMemo(() => {
    const texto = filtro.trim().toLowerCase();
    return (marca ? (catalogo.datos?.catalogoDeMarca ?? []) : []).filter((m) => !texto || m.modelo.toLowerCase().includes(texto));
  }, [catalogo.datos, filtro, marca]);

  const actualizar = (campo, valor) => setFormulario((anterior) => ({ ...anterior, [campo]: valor }));

  function editar(modelo) {
    const anios = modelo.anios.map((a) => a.anio);
    setFormulario({
      marca: modelo.marca,
      modelo: modelo.modelo,
      anioDesde: String(Math.min(...anios)),
      anioHasta: String(Math.max(...anios)),
      motores: motoresDe(modelo).join(', '),
    });
    setAviso(null);
    document.getElementById('vehiculo-formulario')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setAviso(null);
    const datos = {
      marca: formulario.marca.trim(),
      modelo: formulario.modelo.trim(),
      anioDesde: Number(formulario.anioDesde),
      anioHasta: Number(formulario.anioHasta || formulario.anioDesde),
      motores: formulario.motores.split(',').map((m) => m.trim()).filter(Boolean),
    };
    try {
      const { guardarModeloDeVehiculo: filas } = await graphqlRequest(MUTATION_GUARDAR_MODELO_DE_VEHICULO, { datos });
      setAviso({ tipo: 'listo', texto: `${datos.marca} ${datos.modelo}: ${filas.length === 1 ? '1 año guardado' : `${filas.length} años guardados`}.` });
      setFormulario(VACIO);
      if (!listaDeMarcas.some((m) => m.toLowerCase() === datos.marca.toLowerCase())) marcas.recargar();
      setMarca(listaDeMarcas.find((m) => m.toLowerCase() === datos.marca.toLowerCase()) ?? datos.marca);
      setFiltro(datos.modelo);
      setVersion((v) => v + 1);
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(modelo) {
    const anios = modelo.anios.map((a) => a.anio);
    const desde = Math.min(...anios);
    const hasta = Math.max(...anios);
    if (!window.confirm(`¿Quitar ${modelo.marca} ${modelo.modelo} (${tramos(anios)}) del catálogo? Los coches que ya lo tienen en su garage no se borran.`)) return;
    setAviso(null);
    try {
      await graphqlRequest(MUTATION_QUITAR_MODELO_DE_VEHICULO, { marca: modelo.marca, modelo: modelo.modelo, anioDesde: desde, anioHasta: hasta });
      setAviso({ tipo: 'listo', texto: `${modelo.marca} ${modelo.modelo} se quitó del catálogo.` });
      setVersion((v) => v + 1);
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
    }
  }

  if (marcas.cargando) return <Cargando filas={4} alto={48} />;
  if (marcas.error) return <ErrorConReintento mensaje="No se pudo cargar el catálogo de vehículos." onReintentar={marcas.recargar} />;

  return (
    <>
      <section className="hoja admin-seccion" aria-labelledby="vehiculo-formulario">
        <h4 id="vehiculo-formulario">Agregar o corregir un modelo</h4>
        <p className="apagado" style={{ margin: 0 }}>
          Si el modelo ya existe en esos años, se reemplazan sus motores y la importación ya no los cambia.
        </p>
        <form className="formulario" onSubmit={guardar}>
          <datalist id="marcas-del-catalogo">
            {listaDeMarcas.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <div className="campos-2">
            <div className="campo">
              <label htmlFor="catalogo-marca">Marca</label>
              <input id="catalogo-marca" className="input" required maxLength={60} list="marcas-del-catalogo" value={formulario.marca} onChange={(e) => actualizar('marca', e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="catalogo-modelo">Modelo</label>
              <input id="catalogo-modelo" className="input" required maxLength={60} value={formulario.modelo} onChange={(e) => actualizar('modelo', e.target.value)} />
            </div>
          </div>
          <div className="campos-3">
            <div className="campo">
              <label htmlFor="catalogo-desde">Desde (año)</label>
              <input id="catalogo-desde" className="input mono" required type="number" inputMode="numeric" min="1950" max="2100" value={formulario.anioDesde} onChange={(e) => actualizar('anioDesde', e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="catalogo-hasta">Hasta (año)</label>
              <input id="catalogo-hasta" className="input mono" type="number" inputMode="numeric" min="1950" max="2100" placeholder={formulario.anioDesde} value={formulario.anioHasta} onChange={(e) => actualizar('anioHasta', e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="catalogo-motores">Motores (separados por coma)</label>
              <input id="catalogo-motores" className="input" placeholder="1.6L 4 cil., 2.0L 4 cil." value={formulario.motores} onChange={(e) => actualizar('motores', e.target.value)} />
            </div>
          </div>
          {aviso && (
            <p className={aviso.tipo === 'error' ? 'error' : 'admin-listo'} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
              {aviso.texto}
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primario" type="submit" disabled={guardando}>
              {guardando && <Loader2 size={18} className="girar" />}
              Guardar en el catálogo
            </button>
            {(formulario.marca || formulario.modelo) && (
              <button className="btn btn-secundario" type="button" onClick={() => setFormulario(VACIO)}>
                Limpiar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="hoja admin-seccion" aria-label="Modelos del catálogo">
        <BuscadorDeVehiculo
          etiqueta="Buscar un modelo"
          placeholder="Ej. tsuru, vento, cx-5"
          onElegir={(elegido) => {
            setMarca(elegido.marca);
            setFiltro(elegido.modelo);
          }}
        />
        <div className="hoja-titulo">
          <select className="input" aria-label="Marca" style={{ maxWidth: 260 }} value={marca} onChange={(e) => {
              setMarca(e.target.value);
              setFiltro('');
            }}>
            {listaDeMarcas.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <div className="buscador admin-buscador">
            <Search size={18} />
            <input className="input" type="search" placeholder="Filtrar modelos de la marca" aria-label="Filtrar modelos" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
          </div>
        </div>

        {catalogo.cargando ? (
          <Cargando filas={6} alto={40} />
        ) : catalogo.error ? (
          <ErrorConReintento mensaje="No se pudieron cargar los modelos." onReintentar={catalogo.recargar} />
        ) : (
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Modelo</th>
                  <th>Años</th>
                  <th>Motores</th>
                  <th>Origen</th>
                  <th>
                    <span className="solo-lectores">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {modelos.map((modelo) => {
                  const motores = motoresDe(modelo);
                  const delPanel = modelo.anios.filter((a) => a.origen === 'PANEL').length;
                  return (
                    <tr key={modelo.modelo}>
                      <td>{modelo.modelo}</td>
                      <td className="mono">{tramos(modelo.anios.map((a) => a.anio))}</td>
                      <td>{motores.length ? motores.join(' · ') : <span className="apagado">Sin datos (se ofrece la lista general)</span>}</td>
                      <td>
                        {delPanel === 0 ? (
                          <span className="apagado">Importado</span>
                        ) : (
                          <span className="etiqueta">{delPanel === modelo.anios.length ? 'Panel' : `Panel en ${delPanel} años`}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" className="btn btn-secundario btn-chico" onClick={() => editar(modelo)}>
                            Editar
                          </button>
                          <button type="button" className="btn btn-secundario btn-chico" onClick={() => quitar(modelo)}>
                            Quitar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {modelos.length === 0 && <p className="apagado">Ningún modelo coincide.</p>}
          </div>
        )}
        <p className="apagado" style={{ margin: 0 }}>
          Fuentes de lo importado: INEGI, Registro Administrativo de la Industria Automotriz de Vehículos Ligeros (modelos
          vendidos en México); NHTSA vPIC (nombres oficiales) y FuelEconomy.gov (motores).
        </p>
      </section>
    </>
  );
}

export default comoIsla(VehiculosAdmin);
