// Marco de una grafica del panel. Por ahora solo dibuja la reticula y el estado "sin datos":
// todavia no recibe series. En admin.astro se usa sin directiva client:*, asi que Astro lo
// convierte en HTML en el build y no manda JavaScript. Cuando haya datos, aqui se dibujan las
// series y en admin.astro basta agregar client:visible para que cada grafica cargue al entrar en pantalla.

const GUIAS = [0, 25, 50, 75];

// Reticula recesiva: guias tenues y un solo eje marcado. `tipo` decide hacia donde corren las marcas.
function Reticula({ tipo }) {
  const horizontal = tipo === 'barras-h';
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {GUIAS.map((posicion) =>
        horizontal ? (
          <line key={posicion} className="grafica-guia" x1={100 - posicion} y1="0" x2={100 - posicion} y2="100" />
        ) : (
          <line key={posicion} className="grafica-guia" x1="0" y1={posicion} x2="100" y2={posicion} />
        )
      )}
      {horizontal ? (
        <line className="grafica-eje" x1="0" y1="0" x2="0" y2="100" />
      ) : (
        <line className="grafica-eje" x1="0" y1="100" x2="100" y2="100" />
      )}
    </svg>
  );
}

export default function Grafica({ titulo, descripcion, tipo = 'linea', ancho = 'media' }) {
  return (
    <figure className={`grafica ${ancho}`}>
      <figcaption>
        <h4>{titulo}</h4>
        <p className="apagado">{descripcion}</p>
      </figcaption>
      <div className="grafica-lienzo">
        <Reticula tipo={tipo} />
        <p className="grafica-vacia">
          <span>Sin datos todavía</span>
        </p>
      </div>
    </figure>
  );
}
