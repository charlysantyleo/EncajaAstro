import { useEffect, useState } from 'react';
import { Loader2 } from '../ui/Iconos';
import { graphqlRequest } from '../../graphql/client';
import { MUTATION_ACTUALIZAR_AJUSTES, MUTATION_CREAR_CATEGORIA, QUERY_AJUSTES, QUERY_CATEGORIAS } from '../../graphql/queries';
import { useGraphQLQuery } from '../../hooks/useGraphQLQuery';
import { pesos } from '../../lib/formato';
import { Cargando, ErrorConReintento } from '../EstadoCarga';
import { comoIsla } from '../ui/Isla';

// Ajustes de la tienda (envio y precio de taller) y sistemas del catalogo. Solo ADMIN.
function AjustesAdmin() {
  const ajustes = useGraphQLQuery(QUERY_AJUSTES);
  const categorias = useGraphQLQuery(QUERY_CATEGORIAS);
  const [formulario, setFormulario] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [nueva, setNueva] = useState({ nombre: '', descripcion: '' });
  const [creando, setCreando] = useState(false);
  const [avisoCategoria, setAvisoCategoria] = useState(null);

  useEffect(() => {
    const actuales = ajustes.datos?.ajustesDeTienda;
    if (actuales && !formulario) setFormulario(Object.fromEntries(Object.entries(actuales).map(([clave, valor]) => [clave, String(valor)])));
  }, [ajustes.datos, formulario]);

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setAviso(null);
    try {
      const { actualizarAjustes } = await graphqlRequest(MUTATION_ACTUALIZAR_AJUSTES, {
        datos: Object.fromEntries(Object.entries(formulario).map(([clave, valor]) => [clave, Number(valor)])),
      });
      setFormulario(Object.fromEntries(Object.entries(actualizarAjustes).map(([clave, valor]) => [clave, String(valor)])));
      setAviso({ tipo: 'listo', texto: 'Ajustes guardados. Ya aplican en el catálogo y el checkout.' });
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  }

  async function crearCategoria(evento) {
    evento.preventDefault();
    setCreando(true);
    setAvisoCategoria(null);
    try {
      const { crearCategoria: creada } = await graphqlRequest(MUTATION_CREAR_CATEGORIA, {
        datos: { nombre: nueva.nombre.trim(), descripcion: nueva.descripcion.trim() || null },
      });
      setNueva({ nombre: '', descripcion: '' });
      setAvisoCategoria({ tipo: 'listo', texto: `Sistema “${creada.nombre}” agregado.` });
      categorias.recargar();
    } catch (err) {
      setAvisoCategoria({ tipo: 'error', texto: err.message });
    } finally {
      setCreando(false);
    }
  }

  if (ajustes.cargando || !formulario) {
    return ajustes.error ? <ErrorConReintento mensaje="No se pudieron cargar los ajustes." onReintentar={ajustes.recargar} /> : <Cargando filas={3} alto={56} />;
  }

  const campo = (clave) => ({
    id: `ajuste-${clave}`,
    className: 'input mono',
    type: 'number',
    required: true,
    value: formulario[clave],
    onChange: (evento) => setFormulario({ ...formulario, [clave]: evento.target.value }),
  });
  const ejemplo = 649;
  const conDescuento = Math.round(ejemplo * (100 - Number(formulario.descuentoTaller || 0))) / 100;

  return (
    <>
      <section className="hoja admin-seccion" aria-labelledby="ajustes-titulo">
        <h4 id="ajustes-titulo">Envío y precio de taller</h4>
        <form className="formulario" onSubmit={guardar}>
          <div className="campos-3">
            <div className="campo">
              <label htmlFor="ajuste-costoEnvio">Costo del envío a domicilio (MXN)</label>
              <input {...campo('costoEnvio')} min="0" max="5000" step="0.01" inputMode="decimal" />
            </div>
            <div className="campo">
              <label htmlFor="ajuste-envioGratisDesde">Envío gratis desde (MXN en piezas)</label>
              <input {...campo('envioGratisDesde')} min="0" step="0.01" inputMode="decimal" />
            </div>
            <div className="campo">
              <label htmlFor="ajuste-descuentoTaller">Descuento de taller (%)</label>
              <input {...campo('descuentoTaller')} min="0" max="50" step="0.5" inputMode="decimal" />
            </div>
          </div>
          <p className="apagado" style={{ margin: 0 }}>
            Ejemplo: una pieza de {pesos(ejemplo)} le cuesta {pesos(conDescuento)} a una cuenta de taller.
          </p>
          {aviso && (
            <p className={aviso.tipo === 'error' ? 'error' : 'admin-listo'} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
              {aviso.texto}
            </p>
          )}
          <div>
            <button className="btn btn-primario" type="submit" disabled={guardando}>
              {guardando && <Loader2 size={18} className="girar" />}
              Guardar ajustes
            </button>
          </div>
        </form>
      </section>

      <section className="hoja admin-seccion" aria-labelledby="sistemas-titulo">
        <h4 id="sistemas-titulo">Sistemas del catálogo</h4>
        {categorias.cargando ? (
          <Cargando filas={2} alto={40} />
        ) : (
          <ul className="ajustes">
            {(categorias.datos?.categorias ?? []).map((categoria) => (
              <li key={categoria.id} className="ajuste">
                <span>{categoria.nombre}</span>
                {categoria.descripcion && <span className="ajuste-nota">{categoria.descripcion}</span>}
              </li>
            ))}
          </ul>
        )}
        <form className="editor-compat-nueva" onSubmit={crearCategoria}>
          <input className="input" required maxLength={60} placeholder="Nombre del sistema" aria-label="Nombre del sistema nuevo" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} />
          <input className="input" maxLength={160} placeholder="Descripción (opcional)" aria-label="Descripción del sistema nuevo" value={nueva.descripcion} onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })} />
          <button className="btn btn-secundario btn-chico" type="submit" disabled={creando || !nueva.nombre.trim()}>
            Agregar sistema
          </button>
        </form>
        {avisoCategoria && (
          <p className={avisoCategoria.tipo === 'error' ? 'error' : 'admin-listo'} role={avisoCategoria.tipo === 'error' ? 'alert' : 'status'}>
            {avisoCategoria.texto}
          </p>
        )}
      </section>
    </>
  );
}

export default comoIsla(AjustesAdmin);
