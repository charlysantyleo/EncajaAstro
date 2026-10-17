import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from '../ui/Iconos';
import { graphqlRequest } from '../../graphql/client';
import {
  MUTATION_ACTUALIZAR_PRODUCTO,
  MUTATION_CREAR_PRODUCTO,
  MUTATION_ELIMINAR_COMPATIBILIDAD,
  MUTATION_REGISTRAR_COMPATIBILIDAD,
  MUTATION_SUBIR_IMAGEN,
  QUERY_PRODUCTO_PANEL,
} from '../../graphql/queries';
import { imagenDe } from '../../imagenes';
import { describir } from '../../lib/compat';
import NuevaCompatibilidad from './NuevaCompatibilidad';
import Capa from '../ui/Capa';
import { Cargando } from '../EstadoCarga';

const VACIO = { nombre: '', numeroParte: '', marca: '', categoriaId: '', precio: '', stock: '0', descripcion: '', imagen: null };

// Las fotos se achican en el navegador antes de subirlas (lado mayor de 1000 px, WebP):
// pesan unas decenas de KB, cargan rapido en el catalogo y no llenan la base de datos.
async function comprimirFoto(archivo) {
  const mapa = await createImageBitmap(archivo);
  const escala = Math.min(1, 1000 / Math.max(mapa.width, mapa.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(mapa.width * escala);
  lienzo.height = Math.round(mapa.height * escala);
  lienzo.getContext('2d').drawImage(mapa, 0, 0, lienzo.width, lienzo.height);
  const blob = await new Promise((listo) => lienzo.toBlob(listo, 'image/webp', 0.85));
  const base64 = await new Promise((listo, fallo) => {
    const lector = new FileReader();
    lector.onload = () => listo(String(lector.result).split(',')[1]);
    lector.onerror = fallo;
    lector.readAsDataURL(blob);
  });
  // Algunos navegadores no saben escribir WebP y entregan PNG: se manda el tipo real.
  return { tipo: blob.type, base64, vistaPrevia: URL.createObjectURL(blob) };
}

// Alta o edicion de un producto: datos, foto y (al editar) en que vehiculos embona.
// Las existencias solo se capturan al crearlo; despues se suman o restan desde la lista.
export default function EditorProducto({ productoId, categorias, onCerrar, onGuardado }) {
  const nuevo = !productoId;
  const [formulario, setFormulario] = useState(VACIO);
  const [compatibilidades, setCompatibilidades] = useState([]);
  const [cargando, setCargando] = useState(!nuevo);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const actualizar = (campo, valor) => setFormulario((anterior) => ({ ...anterior, [campo]: valor }));

  async function cargarProducto() {
    const { producto } = await graphqlRequest(QUERY_PRODUCTO_PANEL, { id: productoId });
    setFormulario({
      nombre: producto.nombre,
      numeroParte: producto.numeroParte,
      marca: producto.marca ?? '',
      categoriaId: producto.categoria?.id ?? '',
      precio: String(producto.precio),
      stock: String(producto.stock),
      descripcion: producto.descripcion ?? '',
      imagen: producto.imagen,
    });
    setVistaPrevia(imagenDe(producto));
    setCompatibilidades(producto.compatibilidades);
  }

  useEffect(() => {
    if (nuevo) return;
    cargarProducto()
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  async function elegirFoto(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;
    setSubiendoFoto(true);
    setError(null);
    try {
      const { tipo, base64, vistaPrevia: url } = await comprimirFoto(archivo);
      const { subirImagen } = await graphqlRequest(MUTATION_SUBIR_IMAGEN, { tipo, base64 });
      actualizar('imagen', subirImagen);
      setVistaPrevia(url);
    } catch (err) {
      setError(err.message || 'No se pudo leer esa imagen.');
    } finally {
      setSubiendoFoto(false);
    }
  }

  function quitarFoto() {
    actualizar('imagen', null);
    // Sin foto propia, el catalogo usa la original de ese numero de parte (si existe).
    setVistaPrevia(imagenDe({ numeroParte: formulario.numeroParte, imagen: null }));
  }

  async function guardar(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    const datos = {
      nombre: formulario.nombre,
      numeroParte: formulario.numeroParte,
      marca: formulario.marca || null,
      categoriaId: formulario.categoriaId || null,
      precio: Number(formulario.precio),
      descripcion: formulario.descripcion || null,
      imagen: formulario.imagen,
      ...(nuevo ? { stock: Number(formulario.stock) } : {}),
    };
    try {
      if (nuevo) await graphqlRequest(MUTATION_CREAR_PRODUCTO, { datos });
      else await graphqlRequest(MUTATION_ACTUALIZAR_PRODUCTO, { id: productoId, datos });
      onGuardado(nuevo ? `Producto “${datos.nombre}” creado.` : `Cambios de “${datos.nombre}” guardados.`);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  // Regresa si se pudo, para que el formulario se limpie solo entonces.
  async function agregarCompatibilidad(datos) {
    setError(null);
    try {
      await graphqlRequest(MUTATION_REGISTRAR_COMPATIBILIDAD, { datos: { productoId, ...datos } });
      const { producto } = await graphqlRequest(QUERY_PRODUCTO_PANEL, { id: productoId });
      setCompatibilidades(producto.compatibilidades);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  async function quitarCompatibilidad(id) {
    setError(null);
    try {
      await graphqlRequest(MUTATION_ELIMINAR_COMPATIBILIDAD, { id });
      setCompatibilidades((actuales) => actuales.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Capa lado="derecha" titulo={nuevo ? 'Nuevo producto' : 'Editar producto'} onCerrar={onCerrar}>
      <h3>{nuevo ? 'Nuevo producto' : 'Editar producto'}</h3>
      {cargando ? (
        <Cargando filas={5} alto={48} />
      ) : (
        <form className="formulario" onSubmit={guardar}>
          <div className="editor-foto">
            <div className="editor-foto-marco">{vistaPrevia ? <img src={vistaPrevia} alt="" /> : <span className="apagado">Sin foto</span>}</div>
            <div className="editor-foto-acciones">
              <label className="btn btn-secundario btn-chico" htmlFor="producto-foto">
                {subiendoFoto && <Loader2 size={14} className="girar" />}
                {formulario.imagen ? 'Cambiar foto' : 'Subir foto'}
              </label>
              <input id="producto-foto" type="file" accept="image/*" className="solo-lectores" onChange={elegirFoto} disabled={subiendoFoto} />
              {formulario.imagen && (
                <button type="button" className="btn btn-texto btn-chico" onClick={quitarFoto}>
                  Quitar foto
                </button>
              )}
              <span className="apagado">JPG, PNG o WebP. Se achica sola antes de subir.</span>
            </div>
          </div>

          <div className="campo">
            <label htmlFor="producto-nombre">Nombre</label>
            <input id="producto-nombre" className="input" required maxLength={120} value={formulario.nombre} onChange={(e) => actualizar('nombre', e.target.value)} />
          </div>
          <div className="campos-2">
            <div className="campo">
              <label htmlFor="producto-np">Número de parte</label>
              <input id="producto-np" className="input mono" required maxLength={40} value={formulario.numeroParte} onChange={(e) => actualizar('numeroParte', e.target.value.toUpperCase())} />
            </div>
            <div className="campo">
              <label htmlFor="producto-marca">Marca (opcional)</label>
              <input id="producto-marca" className="input" maxLength={60} value={formulario.marca} onChange={(e) => actualizar('marca', e.target.value)} />
            </div>
          </div>
          <div className="campos-2">
            <div className="campo">
              <label htmlFor="producto-categoria">Sistema</label>
              <select id="producto-categoria" className="input" value={formulario.categoriaId} onChange={(e) => actualizar('categoriaId', e.target.value)}>
                <option value="">Sin sistema</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="producto-precio">Precio de lista (MXN)</label>
              <input id="producto-precio" className="input mono" required type="number" min="0.01" step="0.01" inputMode="decimal" value={formulario.precio} onChange={(e) => actualizar('precio', e.target.value)} />
            </div>
          </div>
          {nuevo ? (
            <div className="campo" style={{ maxWidth: 220 }}>
              <label htmlFor="producto-stock">Existencias iniciales</label>
              <input id="producto-stock" className="input mono" required type="number" min="0" step="1" inputMode="numeric" value={formulario.stock} onChange={(e) => actualizar('stock', e.target.value)} />
            </div>
          ) : (
            <p className="apagado" style={{ margin: 0 }}>
              Existencias: <strong className="mono">{formulario.stock}</strong>. Para sumar o restar piezas usa la columna Existencias de la lista.
            </p>
          )}
          <div className="campo">
            <label htmlFor="producto-descripcion">Descripción (opcional)</label>
            <textarea id="producto-descripcion" className="input" rows={3} maxLength={600} value={formulario.descripcion} onChange={(e) => actualizar('descripcion', e.target.value)} />
          </div>

          {!nuevo && (
            <div className="editor-compat">
              <h5>Embona en</h5>
              {compatibilidades.length === 0 && <p className="apagado" style={{ margin: 0 }}>Todavía no está ligada a ningún vehículo.</p>}
              <ul className="ajustes">
                {compatibilidades.map((compat) => (
                  <li key={compat.id} className="ajuste">
                    <span>{describir(compat)}</span>
                    <span className="etiqueta">{compat.tipo === 'DIRECTO' ? 'Directo' : 'Equivalencia'}</span>
                    <button type="button" className="btn-icono" aria-label={`Quitar ${describir(compat)}`} onClick={() => quitarCompatibilidad(compat.id)}>
                      <Trash2 size={16} />
                    </button>
                    {compat.nota && <span className="ajuste-nota">{compat.nota}</span>}
                  </li>
                ))}
              </ul>
              <NuevaCompatibilidad onAgregar={agregarCompatibilidad} />
            </div>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button className="btn btn-primario btn-bloque" type="submit" disabled={guardando || subiendoFoto}>
            {guardando && <Loader2 size={18} className="girar" />}
            {nuevo ? 'Crear producto' : 'Guardar cambios'}
          </button>
        </form>
      )}
    </Capa>
  );
}
