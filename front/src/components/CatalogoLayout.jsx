import { Receipt } from 'lucide-react';
import { useTienda } from '../store/useTienda';
import CategoriaTabs from './CategoriaTabs';
import Nota from './Nota';
import { Importe } from './ui/Movimiento';

// Estructura comun de inicio y categorias: tabs arriba, catalogo a la izquierda, nota a la derecha.
// Bajo 1180px la nota se resume en una barra fija inferior.
export default function CatalogoLayout({ children }) {
  const carrito = useTienda((estado) => estado.carrito);
  const ir = useTienda((estado) => estado.ir);
  const piezas = carrito.reduce((suma, item) => suma + item.cantidad, 0);
  const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);

  return (
    <>
      <CategoriaTabs />
      <div className="contenedor">
        <div className="catalogo">
          <div className="catalogo-col">{children}</div>
          <Nota />
        </div>
      </div>

      {piezas > 0 && (
        <div className="barra-movil">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={18} /> {piezas} {piezas === 1 ? 'pieza' : 'piezas'}
          </span>
          <strong>
            <Importe valor={total} />
          </strong>
          <button className="btn btn-primario btn-chico" onClick={() => ir('irACarrito')}>
            Ver nota
          </button>
        </div>
      )}
    </>
  );
}
