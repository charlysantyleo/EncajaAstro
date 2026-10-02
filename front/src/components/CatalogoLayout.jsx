import CategoriaTabs from './CategoriaTabs';
import Nota from './Nota';

// Estructura de inicio y categorias sobre la rejilla: indice de sistemas a la izquierda,
// contenido a la derecha y la nota como franja fija abajo (no carrito lateral).
export default function CatalogoLayout({ children }) {
  return (
    <>
      <div className="rejilla catalogo">
        <aside className="catalogo-lateral">
          <CategoriaTabs />
        </aside>
        <div className="catalogo-col">{children}</div>
      </div>
      <Nota />
    </>
  );
}
