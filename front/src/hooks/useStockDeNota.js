import { useEffect, useState } from 'react';
import { graphqlRequest } from '../graphql/client';
import { QUERY_PRODUCTO_STOCK } from '../graphql/queries';
import { useTienda } from '../store/useTienda';

// Pregunta al servidor las existencias de cada pieza de la nota al abrir la pagina.
// La nota vive en el navegador y puede traer cantidades viejas (alguien mas compro mientras tanto):
// la usan el carrito y el checkout para no dejar pasar un pedido que el servidor va a rechazar.
// `excesos` son los renglones que piden mas de lo que hay; si no se pudo consultar una pieza no cuenta.
// De paso pone al dia el precio de cada renglon (lista nueva, o precio de taller si la cuenta cambio).
export function useStockDeNota(carrito) {
  const actualizarPrecios = useTienda((estado) => estado.actualizarPrecios);
  const [stockReal, setStockReal] = useState({});
  const [revisando, setRevisando] = useState(true);

  useEffect(() => {
    let sigueActivo = true;
    setRevisando(true);
    Promise.all(
      carrito.map((item) =>
        graphqlRequest(QUERY_PRODUCTO_STOCK, { id: item.productoId })
          .then((datos) => [item.productoId, datos.producto?.stock ?? 0, datos.producto?.precioParaTi])
          .catch(() => [item.productoId, null, null])
      )
    )
      .then((filas) => {
        if (!sigueActivo) return;
        setStockReal(Object.fromEntries(filas.map(([id, stock]) => [id, stock])));
        actualizarPrecios(Object.fromEntries(filas.filter(([, , precio]) => precio != null).map(([id, , precio]) => [id, precio])));
      })
      .finally(() => {
        if (sigueActivo) setRevisando(false);
      });
    return () => {
      sigueActivo = false;
    };
    // Solo al abrir la pagina: al cambiar cantidades no hace falta volver a preguntar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const excesos = carrito
    .map((item) => ({ ...item, disponible: stockReal[item.productoId] }))
    .filter((item) => item.disponible != null && item.cantidad > item.disponible);

  return { stockReal, revisando, excesos };
}
