import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Plus, Search } from '../ui/Iconos';
import { graphqlRequest } from '../../graphql/client';
import { MUTATION_AJUSTAR_STOCK, QUERY_CATEGORIAS, QUERY_PRODUCTOS_PANEL } from '../../graphql/queries';
import { useGraphQLQuery } from '../../hooks/useGraphQLQuery';
import { imagenDe } from '../../imagenes';
import { pesos } from '../../lib/formato';
import { Cargando, ErrorConReintento } from '../EstadoCarga';
import EditorProducto from './EditorProducto';
import { comoIsla } from '../ui/Isla';

// Suma o resta piezas a las existencias de un producto, sin pisar ventas que lleguen mientras tanto.
function AjusteDeStock({ producto, onAjustado, onError }) {
  const [cantidad, setCantidad] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aplicar(evento) {
    evento.preventDefault();
    const numero = Number(cantidad);
    if (!Number.isInteger(numero) || numero === 0) return;
    setEnviando(true);
    try {
      const { ajustarStock } = await graphqlRequest(MUTATION_AJUSTAR_STOCK, { productoId: producto.id, cantidad: numero });
      onAjustado(producto, ajustarStock.stock, numero);
      setCantidad('');
    } catch (err) {
      onError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="ajuste-stock" onSubmit={aplicar}>
      <span className={producto.stock <= 0 ? 'mono error' : 'mono'}>{producto.stock}</span>
      <input
        className="input mono"
        type="number"
        step="1"
        inputMode="numeric"
        placeholder="+10"
        aria-label={`Piezas a sumar o restar de ${producto.nombre}`}
        value={cantidad}
        onChange={(evento) => setCantidad(evento.target.value)}
      />
      <button type="submit" className="btn btn-secundario btn-chico" disabled={enviando || !cantidad || Number(cantidad) === 0}>
        Aplicar
      </button>
    </form>
  );
}

// Catalogo para el ADMIN: buscar, crear y editar productos (con foto y compatibilidades) y ajustar existencias.
function ProductosAdmin() {
  const productos = useGraphQLQuery(QUERY_PRODUCTOS_PANEL);
  const categorias = useGraphQLQuery(QUERY_CATEGORIAS);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState(null); // null = cerrado, 'nuevo' o el id
  const [existencias, setExistencias] = useState({});
  const [aviso, setAviso] = useState(null);

  const lista = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (productos.datos?.productos ?? [])
      .map((producto) => (existencias[producto.id] != null ? { ...producto, stock: existencias[producto.id] } : producto))
      .filter((producto) => !texto || [producto.nombre, producto.numeroParte, producto.marca ?? ''].some((campo) => campo.toLowerCase().includes(texto)));
  }, [productos.datos, existencias, busqueda]);

  function alGuardar(texto) {
    setEditando(null);
    setAviso({ tipo: 'listo', texto });
    setExistencias({});
    productos.recargar();
  }

  if (productos.cargando || categorias.cargando) return <Cargando filas={6} alto={64} />;
  if (productos.error) return <ErrorConReintento mensaje="No se pudo cargar el catálogo." onReintentar={productos.recargar} />;

  return (
    <section className="hoja admin-seccion" aria-label="Productos">
      <div className="hoja-titulo">
        <div className="buscador admin-buscador">
          <Search size={18} />
          <input className="input" type="search" placeholder="Buscar por nombre, número de parte o marca" aria-label="Buscar productos" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
        </div>
        <button type="button" className="btn btn-primario" onClick={() => setEditando('nuevo')}>
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      {aviso && (
        <p className={aviso.tipo === 'error' ? 'error' : 'admin-listo'} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
          {aviso.texto}
        </p>
      )}

      <div className="tabla-envoltura">
        <table className="tabla">
          <thead>
            <tr>
              <th>
                <span className="solo-lectores">Foto</span>
              </th>
              <th>N.º de parte</th>
              <th>Pieza</th>
              <th>Sistema</th>
              <th className="num">Precio</th>
              <th>Existencias</th>
              <th>
                <span className="solo-lectores">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {lista.map((producto) => {
              const foto = imagenDe(producto);
              return (
                <tr key={producto.id}>
                  <td>
                    <span className="tabla-foto">{foto && <img src={foto} alt="" loading="lazy" width="56" height="42" />}</span>
                  </td>
                  <td className="mono">{producto.numeroParte}</td>
                  <td>
                    {producto.nombre}
                    {producto.marca && <div className="apagado">{producto.marca}</div>}
                  </td>
                  <td>{producto.categoria?.nombre ?? <span className="apagado">—</span>}</td>
                  <td className="num">{pesos(producto.precio)}</td>
                  <td>
                    <AjusteDeStock
                      producto={producto}
                      onAjustado={(p, stock, cantidad) => {
                        setExistencias((anteriores) => ({ ...anteriores, [p.id]: stock }));
                        setAviso({ tipo: 'listo', texto: `${p.nombre}: ${cantidad > 0 ? `+${cantidad}` : cantidad} piezas, quedan ${stock}.` });
                      }}
                      onError={(texto) => setAviso({ tipo: 'error', texto })}
                    />
                  </td>
                  <td>
                    <button type="button" className="btn btn-secundario btn-chico" onClick={() => setEditando(producto.id)}>
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lista.length === 0 && <p className="apagado">Ningún producto coincide con la búsqueda.</p>}
      </div>

      <AnimatePresence>
        {editando && (
          <EditorProducto
            key={editando}
            productoId={editando === 'nuevo' ? null : editando}
            categorias={categorias.datos?.categorias ?? []}
            onCerrar={() => setEditando(null)}
            onGuardado={alGuardar}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

export default comoIsla(ProductosAdmin);
