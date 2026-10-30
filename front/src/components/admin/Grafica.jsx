import { useEffect, useRef, useState } from 'react';

// Graficas del tablero, hechas a mano con SVG y HTML (sin librerias): una sola serie por grafica, en el rojo de
// la marca (--grafica-serie, validado contra el papel claro y el oscuro), guias tenues de 1px, barras de 16px
// con la punta redondeada y una tabla equivalente debajo de cada una ("Ver como tabla").

const compacto = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });

// Techo "redondo" para el eje: 0–4 se queda en 4, 0–7 sube a 8, 0–1,830 sube a 2,000...
function techo(maximo, enteros) {
  if (maximo <= 0) return enteros ? 4 : 1;
  const exponente = 10 ** Math.floor(Math.log10(maximo));
  const f = maximo / exponente;
  const redondo = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exponente;
  return enteros ? Math.max(4, Math.ceil(redondo / 4) * 4) : redondo;
}

function useAncho() {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const observador = new ResizeObserver(([entrada]) => setAncho(entrada.contentRect.width));
    observador.observe(ref.current);
    return () => observador.disconnect();
  }, []);
  return [ref, ancho];
}

// Marco de cada grafica: titulo, lienzo (o "sin datos") y la tabla equivalente.
export default function Grafica({ titulo, descripcion, ancho = 'media', vacia = false, tabla, children }) {
  return (
    <figure className={`grafica ${ancho}`}>
      <figcaption>
        <h4>{titulo}</h4>
        {descripcion && <p className="apagado">{descripcion}</p>}
      </figcaption>
      <div className="grafica-lienzo">
        {vacia ? (
          <p className="grafica-vacia">
            <span>Sin datos en este periodo</span>
          </p>
        ) : (
          children
        )}
      </div>
      {tabla && !vacia && (
        <details className="grafica-tabla">
          <summary>Ver como tabla</summary>
          <table className="tabla tabla-compacta">
            <thead>
              <tr>
                {tabla.columnas.map((columna, i) => (
                  <th key={columna} className={i > 0 ? 'num' : undefined}>
                    {columna}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabla.filas.map((fila, i) => (
                <tr key={i}>
                  {fila.map((celda, j) => (
                    <td key={j} className={j > 0 ? 'num' : undefined}>
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}

// Linea con area tenue para una serie en el tiempo. La linea vertical sigue al puntero (o a las flechas del
// teclado) y el globo muestra el valor de ese dia.
export function GraficaLinea({ puntos, formato, formatoEtiqueta, enteros = false, nombre }) {
  const [ref, ancho] = useAncho();
  const [activo, setActivo] = useState(null);
  const alto = 220;
  const m = { arriba: 12, derecha: 16, abajo: 28, izquierda: 56 };
  const w = Math.max(0, ancho - m.izquierda - m.derecha);
  const h = alto - m.arriba - m.abajo;
  const n = puntos.length;
  const maximo = techo(Math.max(0, ...puntos.map((p) => p.valor)), enteros);
  const x = (i) => m.izquierda + (n <= 1 ? w / 2 : (i * w) / (n - 1));
  const y = (v) => m.arriba + h - (v / maximo) * h;
  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join('');
  const area = `${linea}L${x(n - 1).toFixed(1)},${m.arriba + h}L${x(0).toFixed(1)},${m.arriba + h}Z`;
  const guias = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maximo);
  const marcas = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : puntos.map((_, i) => i);

  function apuntar(evento) {
    const caja = evento.currentTarget.getBoundingClientRect();
    const i = Math.round(((evento.clientX - caja.left - m.izquierda) / Math.max(w, 1)) * (n - 1));
    setActivo(Math.min(n - 1, Math.max(0, i)));
  }
  function tecla(evento) {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
    evento.preventDefault();
    setActivo((i) => Math.min(n - 1, Math.max(0, (i ?? n - 1) + (evento.key === 'ArrowRight' ? 1 : -1))));
  }

  const punto = activo != null ? puntos[activo] : null;
  return (
    <div ref={ref} className="grafica-linea" style={{ height: alto }}>
      {ancho > 0 && (
        <svg
          width={ancho}
          height={alto}
          tabIndex={0}
          role="img"
          aria-label={`${nombre}. Usa las flechas para recorrer los días.`}
          onPointerMove={apuntar}
          onPointerLeave={() => setActivo(null)}
          onFocus={() => setActivo(n - 1)}
          onBlur={() => setActivo(null)}
          onKeyDown={tecla}
        >
          {guias.map((valor) => (
            <g key={valor}>
              <line className={valor === 0 ? 'grafica-eje' : 'grafica-guia'} x1={m.izquierda} x2={m.izquierda + w} y1={y(valor)} y2={y(valor)} />
              <text className="grafica-texto" x={m.izquierda - 8} y={y(valor)} dy="0.32em" textAnchor="end">
                {compacto.format(valor)}
              </text>
            </g>
          ))}
          {marcas.map((i) => (
            <text key={i} className="grafica-texto" x={x(i)} y={alto - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
              {formatoEtiqueta(puntos[i].etiqueta)}
            </text>
          ))}
          <path className="grafica-area" d={area} />
          <path className="grafica-trazo" d={linea} />
          {punto && (
            <g>
              <line className="grafica-cruz" x1={x(activo)} x2={x(activo)} y1={m.arriba} y2={m.arriba + h} />
              <circle className="grafica-marca" cx={x(activo)} cy={y(punto.valor)} r="4" />
            </g>
          )}
        </svg>
      )}
      {punto && (
        <div className="grafica-globo" style={{ left: Math.min(Math.max(x(activo), 70), ancho - 70) }} aria-live="polite">
          <strong>{formato(punto.valor)}</strong>
          <span>{formatoEtiqueta(punto.etiqueta, true)}</span>
        </div>
      )}
    </div>
  );
}

// Barras horizontales: una por renglon, el valor en la punta. Para nombres largos (piezas, busquedas).
export function BarrasHorizontales({ puntos, formato }) {
  const maximo = Math.max(0, ...puntos.map((p) => p.valor)) || 1;
  return (
    <ul className="barras-h">
      {puntos.map((p) => (
        <li key={p.etiqueta} title={`${p.etiqueta}: ${formato(p.valor)}`}>
          <span className="barras-h-etiqueta">{p.etiqueta}</span>
          <span className="barras-h-pista" aria-hidden="true">
            <span className="barras-h-barra" style={{ width: `${(p.valor / maximo) * 100}%` }} />
          </span>
          <span className="barras-h-valor">{formato(p.valor)}</span>
        </li>
      ))}
    </ul>
  );
}

// Columnas para pocas categorias en orden (estados de un pedido): el valor sobre cada columna.
export function Columnas({ puntos, formato, etiqueta = (e) => e }) {
  const maximo = Math.max(0, ...puntos.map((p) => p.valor)) || 1;
  return (
    <ul className="columnas">
      {puntos.map((p) => (
        <li key={p.etiqueta} title={`${etiqueta(p.etiqueta)}: ${formato(p.valor)}`}>
          <span className="columnas-pista">
            <span className="columnas-barra" style={{ height: `${(p.valor / maximo) * 100}%` }} />
            <span className="columnas-valor" style={{ bottom: `calc(${(p.valor / maximo) * 100}% + 4px)` }}>
              {formato(p.valor)}
            </span>
          </span>
          <span className="columnas-etiqueta">{etiqueta(p.etiqueta)}</span>
        </li>
      ))}
    </ul>
  );
}
