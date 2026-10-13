import { useStockSuscripcion } from '../hooks/useStockSuscripcion';

// Isla sin interfaz: abre el WebSocket de existencias en vivo. Solo va en las paginas que muestran
// stock (catalogo y ficha del vehiculo) y con client:idle, para no competir con la carga de la pagina.
export default function StockEnVivo() {
  useStockSuscripcion();
  return null;
}
