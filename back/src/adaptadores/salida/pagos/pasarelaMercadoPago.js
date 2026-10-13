// Adaptador de salida: implementa el puerto Pasarela con la API de Mercado Pago.
// Cobra tarjetas (el token lo genera el navegador con el Brick, aqui nunca llega el numero de tarjeta),
// crea fichas para pagar en efectivo (OXXO, 7-Eleven...) y links de pago (Checkout Pro).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { METODOS, STATUS_PAGO, TIENDAS, yaVencio } from '../../../dominio/pagos.js';

const API = 'https://api.mercadopago.com';
const MONEDA = 'MXN';

// Como se llama cada tienda en Mercado Pago (payment_method_id).
const ID_DE_TIENDA = { [TIENDAS.OXXO]: 'oxxo', [TIENDAS.PAYCASH]: 'paycash' };

const STATUS = {
  approved: STATUS_PAGO.APROBADO,
  authorized: STATUS_PAGO.PENDIENTE,
  pending: STATUS_PAGO.PENDIENTE,
  in_process: STATUS_PAGO.PENDIENTE,
  in_mediation: STATUS_PAGO.PENDIENTE,
  rejected: STATUS_PAGO.RECHAZADO,
  cancelled: STATUS_PAGO.CANCELADO,
  refunded: STATUS_PAGO.CANCELADO,
  charged_back: STATUS_PAGO.CANCELADO,
};
const EN_CURSO = ['pending', 'in_process', 'authorized', 'in_mediation'];

// Motivos de rechazo mas comunes (status_detail), en palabras del comprador.
const MOTIVOS = {
  cc_rejected_insufficient_amount: 'La tarjeta no tiene fondos suficientes.',
  cc_rejected_bad_filled_security_code: 'El código de seguridad no es correcto.',
  cc_rejected_bad_filled_date: 'La fecha de vencimiento no es correcta.',
  cc_rejected_bad_filled_card_number: 'El número de tarjeta no es correcto.',
  cc_rejected_bad_filled_other: 'Revisa los datos de la tarjeta.',
  cc_rejected_call_for_authorize: 'Tu banco pide que autorices el pago; llámales y vuelve a intentar.',
  cc_rejected_card_disabled: 'La tarjeta está inactiva; actívala con tu banco.',
  cc_rejected_duplicated_payment: 'Ya hiciste un pago por este monto; si necesitas repetirlo usa otra tarjeta.',
  cc_rejected_high_risk: 'El pago fue rechazado por seguridad. Prueba con otro método.',
  cc_rejected_max_attempts: 'Llegaste al límite de intentos con esta tarjeta.',
  pending_contingency: 'Estamos procesando el pago; te avisamos en cuanto se confirme.',
  pending_review_manual: 'El pago está en revisión; te avisamos en cuanto se confirme.',
  expired: 'La ficha venció sin pagarse.',
};

// Mercado Pago espera la fecha con desfase explicito ("...000+00:00"), no con "Z".
const fechaMP = (iso) => iso.replace('Z', '+00:00');

/** @returns {import('../../../puertos/salida.js').Pasarela} */
export function crearPasarelaMercadoPago({ accessToken, publicKey, webhookSecret }) {
  async function llamar(metodo, ruta, { cuerpo, idempotencia } = {}) {
    const respuesta = await fetch(API + ruta, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(idempotencia ? { 'X-Idempotency-Key': idempotencia } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      throw new Error(`Mercado Pago respondió ${respuesta.status}: ${datos.message ?? datos.error ?? 'sin detalle'}`);
    }
    return datos;
  }

  const aResultado = (pago) => ({
    status: STATUS[pago.status] ?? STATUS_PAGO.PENDIENTE,
    idExterno: String(pago.id),
    url: pago.transaction_details?.external_resource_url ?? null,
    codigo:
      pago.transaction_details?.payment_method_reference_id ??
      pago.transaction_details?.verification_code ??
      pago.barcode?.content ??
      null,
    vence: pago.date_of_expiration ?? null,
    detalle: MOTIVOS[pago.status_detail] ?? null,
  });

  // La referencia viaja como external_reference: con ella encontramos el pedido cuando Mercado Pago avisa.
  const comunes = ({ referencia, monto, descripcion, comprador, urls }) => ({
    transaction_amount: monto,
    description: descripcion,
    external_reference: referencia,
    payer: { email: comprador.email },
    ...(urls.notificacion ? { notification_url: urls.notificacion } : {}),
  });

  return {
    configurada: Boolean(accessToken),
    cobraTarjetas: Boolean(accessToken && publicKey),
    llavePublica: publicKey ?? null,

    async cobrarTarjeta(cobro) {
      const pago = await llamar('POST', '/v1/payments', {
        idempotencia: cobro.referencia,
        cuerpo: {
          ...comunes(cobro),
          token: cobro.tarjeta.token,
          installments: cobro.tarjeta.cuotas ?? 1,
          payment_method_id: cobro.tarjeta.metodoId,
          ...(cobro.tarjeta.emisorId ? { issuer_id: cobro.tarjeta.emisorId } : {}),
          statement_descriptor: 'ENCAJA',
        },
      });
      return aResultado(pago);
    },

    async crearFichaTienda(cobro) {
      const pago = await llamar('POST', '/v1/payments', {
        idempotencia: cobro.referencia,
        cuerpo: {
          ...comunes(cobro),
          payment_method_id: ID_DE_TIENDA[cobro.tienda],
          date_of_expiration: fechaMP(cobro.vence),
        },
      });
      return { ...aResultado(pago), vence: cobro.vence };
    },

    // Link de pago = preferencia de Checkout Pro. Se excluyen efectivo y cajero para que
    // el link se pague al momento; el efectivo tiene su propio metodo con ficha.
    async crearLink(cobro) {
      const regresaPorHttps = cobro.urls.retorno.startsWith('https://');
      const preferencia = await llamar('POST', '/checkout/preferences', {
        cuerpo: {
          items: cobro.lineas.map((linea) => ({
            title: linea.nombre,
            quantity: linea.cantidad,
            unit_price: linea.precio,
            currency_id: MONEDA,
          })),
          payer: { name: cobro.comprador.nombre, email: cobro.comprador.email },
          external_reference: cobro.referencia,
          back_urls: { success: cobro.urls.retorno, pending: cobro.urls.retorno, failure: cobro.urls.retorno },
          // Mercado Pago solo regresa solo al sitio si la URL de regreso es https (en local hay que dar clic en "volver").
          ...(regresaPorHttps ? { auto_return: 'approved' } : {}),
          ...(cobro.urls.notificacion ? { notification_url: cobro.urls.notificacion } : {}),
          payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }] },
          expires: true,
          expiration_date_to: fechaMP(cobro.vence),
          statement_descriptor: 'ENCAJA',
        },
      });
      return {
        status: STATUS_PAGO.PENDIENTE,
        idExterno: String(preferencia.id),
        url: preferencia.init_point,
        codigo: null,
        vence: cobro.vence,
        detalle: null,
      };
    },

    // Estado actual del cobro en Mercado Pago.
    async consultar(pago) {
      if (pago.metodo !== METODOS.LINK) {
        const { status, detalle } = aResultado(await llamar('GET', `/v1/payments/${pago.idExterno}`));
        return { status, detalle };
      }
      // Un link admite varios intentos: basta uno aprobado. Un intento rechazado no cancela el pedido,
      // porque el comprador puede reintentar en el mismo link hasta que venza.
      const busqueda = new URLSearchParams({ external_reference: pago.referencia, sort: 'date_created', criteria: 'desc' });
      const { results: intentos = [] } = await llamar('GET', `/v1/payments/search?${busqueda}`);
      if (intentos.some((intento) => intento.status === 'approved')) return { status: STATUS_PAGO.APROBADO, detalle: null };
      if (intentos.some((intento) => EN_CURSO.includes(intento.status))) {
        return { status: STATUS_PAGO.PENDIENTE, detalle: MOTIVOS.pending_contingency };
      }
      if (yaVencio(pago.vence)) return { status: STATUS_PAGO.CANCELADO, detalle: 'El link venció sin pagarse.' };
      return { status: STATUS_PAGO.PENDIENTE, detalle: null };
    },

    // Un aviso (webhook) solo trae el id del pago en Mercado Pago; con el se pregunta a que referencia pertenece.
    async referenciaDeNotificacion(idPagoExterno) {
      const pago = await llamar('GET', `/v1/payments/${idPagoExterno}`);
      return pago.external_reference ?? null;
    },

    // Comprueba la firma x-signature del aviso: HMAC-SHA256 de "id:..;request-id:..;ts:..;" con el secreto del webhook.
    // Sin secreto configurado no se puede comprobar; no es grave porque el aviso nunca se usa como dato:
    // el estado siempre se vuelve a preguntar a la API con nuestro access token.
    firmaValida({ firma, idPeticion, idDato }) {
      if (!webhookSecret) return true;
      const partes = Object.fromEntries((firma ?? '').split(',').map((parte) => parte.trim().split('=')));
      if (!partes.ts || !partes.v1) return false;
      const manifiesto = `id:${String(idDato ?? '').toLowerCase()};request-id:${idPeticion ?? ''};ts:${partes.ts};`;
      const esperada = createHmac('sha256', webhookSecret).update(manifiesto).digest('hex');
      const recibida = Buffer.from(partes.v1);
      return recibida.length === esperada.length && timingSafeEqual(recibida, Buffer.from(esperada));
    },
  };
}
