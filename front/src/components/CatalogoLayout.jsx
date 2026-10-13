import CategoriaTabs from './CategoriaTabs';

// Estructura de inicio y categorias sobre la rejilla: indice de sistemas a la izquierda
// y contenido a la derecha. La nota (franja fija abajo) es una isla aparte: ver pages/index.astro.
export default function CatalogoLayout({ children }) {
  return (
    <div className="rejilla catalogo">
      <aside className="catalogo-lateral">
        <CategoriaTabs />
      </aside>
      <div className="catalogo-col">{children}</div>
    </div>
  );
}
