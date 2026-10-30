import CategoriaTabs from './CategoriaTabs';

// Estructura de inicio y categorias sobre la rejilla: indice de sistemas a la izquierda y contenido al centro.
// Con `nota` (pagina de inicio), la nota va en una tercera columna a la derecha en pantallas anchas;
// en las angostas se queda la franja fija de abajo (Nota.jsx, una isla aparte: ver pages/index.astro).
export default function CatalogoLayout({ children, nota = null }) {
  return (
    <div className={nota ? 'rejilla catalogo con-nota' : 'rejilla catalogo'}>
      <aside className="catalogo-lateral">
        <CategoriaTabs />
      </aside>
      <div className="catalogo-col">{children}</div>
      {nota && <aside className="catalogo-nota">{nota}</aside>}
    </div>
  );
}
