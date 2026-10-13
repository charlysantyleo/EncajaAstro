// Adaptador de entrada HTTP para los avisos (webhooks) de las pasarelas de cobro.
// Mercado Pago avisa aqui cuando un pago cambia: por ejemplo, cuando alguien paga su ficha en OXXO dias despues.
import express from 'express';

export function crearRutasPagos({ pagos }) {
  const rutas = express.Router();

  // El aviso trae ?data.id=<id del pago>&type=payment (y lo mismo en el cuerpo).
  rutas.post('/webhooks/mercadopago', express.json(), async (req, res) => {
    const idDato = req.query['data.id'] ?? req.body?.data?.id;
    const tipo = req.query.type ?? req.body?.type;
    // Avisos de otro tipo (ordenes, contracargos...) se dan por recibidos para que no se reintenten.
    if (tipo !== 'payment' || !idDato) return res.sendStatus(200);

    const valida = pagos.notificacionValida({
      firma: req.get('x-signature'),
      idPeticion: req.get('x-request-id'),
      idDato: req.query['data.id'],
    });
    if (!valida) return res.sendStatus(401);

    try {
      await pagos.notificacionDePago(String(idDato));
      return res.sendStatus(200);
    } catch (error) {
      // Con un 500 Mercado Pago vuelve a mandar el aviso mas tarde.
      console.error('[pagos] No se pudo procesar el aviso de Mercado Pago:', error.message);
      return res.sendStatus(500);
    }
  });

  return rutas;
}
