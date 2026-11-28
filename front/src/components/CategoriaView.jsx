import { useTienda } from '../store/useTienda';
import { leerParametros } from '../lib/rutas';
import { slug } from '../lib/slug';
import { useCategorias, useProductos } from '../hooks/useCatalogo';
import { useDelNavegador } from '../hooks/useEnNavegador';
import CatalogoLayout from './CatalogoLayout';
import ListaProductos from './ListaProductos';
import { comoIsla } from './ui/Isla';
import { useT } from '../i18n/react';

// Dos usos:
//  - /categoria/<sistema> (pages/categoria/[slug].astro): la categoria y sus piezas vienen del build, asi el HTML
//    ya trae el titulo y la lista (client:load hidrata encima).
//  - /categoria?q=texto (busqueda) y las URL viejas ?id= o ?slug=: todo se resuelve en el navegador (client:only).
function CategoriaView({ categoria = null, categorias = [], productosIniciales = null }) {
  const t = useT();
  const parametros = categoria ? {} : leerParametros();
  const { categorias: delServidor } = useCategorias();
  const porSlug = parametros.slug ? delServidor.find((c) => slug(c.nombre) === parametros.slug) : null;
  const categoriaId = categoria?.id ?? porSlug?.id ?? parametros.id ?? null;
  const categoriaNombre = categoria?.nombre ?? porSlug?.nombre ?? parametros.nombre;
  const texto = parametros.q;
  const vehiculoActivo = useDelNavegador(useTienda((estado) => estado.vehiculoActivo), null);
  const soloDirectos = useDelNavegador(useTienda((estado) => estado.soloDirectos), false);
  const ir = useTienda((estado) => estado.ir);

  const { productos, cargando, error, recargar } = useProductos({
    categoriaId,
    vehiculoId: vehiculoActivo?.id,
    texto,
    soloDirectos,
    iniciales: productosIniciales,
  });

  const titulo = texto ? t('catalogo.resultadosPara', { texto }) : (categoriaNombre ?? t('catalogo.catalogo'));

  return (
    <CatalogoLayout categorias={categorias} activa={texto ? null : (categoriaId ?? 'todo')}>
      <div>
        <h1>{titulo}</h1>
        {categoria?.descripcion && (
          <p className="apagado" style={{ marginTop: 12, marginBottom: 0 }}>
            {categoria.descripcion}.
          </p>
        )}
        {vehiculoActivo && (
          <p className="apagado" style={{ marginTop: 12, marginBottom: 0 }}>
            {t('catalogo.filtradoPor', { auto: `${vehiculoActivo.marca} ${vehiculoActivo.modelo} ${vehiculoActivo.anio}` })}
          </p>
        )}
      </div>

      <ListaProductos
        productos={productos}
        cargando={cargando}
        error={error}
        recargar={recargar}
        vacio={
          <>
            <p>{t('catalogo.sinCoincidencias')}</p>
            {vehiculoActivo && (
              <button className="btn btn-secundario" onClick={() => ir('abrirSelectorVehiculo')}>
                {t('catalogo.cambiarVehiculo')}
              </button>
            )}
          </>
        }
      />
    </CatalogoLayout>
  );
}

export default comoIsla(CategoriaView);
