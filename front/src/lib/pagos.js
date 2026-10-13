// Textos de los metodos de pago, en un solo lugar para el checkout y la pagina de pago.

export const METODOS = {
  TARJETA: {
    titulo: 'Tarjeta de crédito o débito',
    descripcion: 'Se cobra al confirmar. Los datos de la tarjeta van directo a Mercado Pago.',
    accion: 'Pagar',
  },
  TIENDA: {
    titulo: 'Efectivo en tienda',
    descripcion: 'Te damos una ficha para pagar en caja; tu pedido se confirma cuando la tienda avisa.',
    accion: 'Generar ficha de pago',
  },
  LINK: {
    titulo: 'Link de pago',
    descripcion: 'Paga ahora o compártelo con quien vaya a pagar.',
    accion: 'Generar link de pago',
  },
  PICKUP: {
    titulo: 'Pagar al recoger',
    descripcion: 'Apartamos tus piezas y pagas en mostrador cuando pases por ellas.',
    accion: 'Confirmar pedido',
  },
};

export const PROVEEDORES = { MERCADO_PAGO: 'Mercado Pago', PAYPAL: 'PayPal' };

export const TIENDAS = {
  OXXO: 'OXXO',
  PAYCASH: '7-Eleven, Circle K, Soriana, Extra o Calimax',
};

export const STATUS_PEDIDO = {
  PENDIENTE: 'Pendiente de pago',
  PAGADO: 'Pagado',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

// Lo que se manda en PedidoInput.pago a partir de lo elegido en el checkout.
export function pagoParaEnviar({ metodo, proveedor, tienda }, tarjeta = null) {
  return {
    metodo,
    ...(metodo === 'LINK' ? { proveedor } : {}),
    ...(metodo === 'TIENDA' ? { tienda } : {}),
    ...(metodo === 'TARJETA' ? { tarjeta } : {}),
  };
}
