// Adaptador de salida: implementa el puerto Pasarela con la API de PayPal (Orders v2).
// Aqui PayPal solo atiende links de pago: se crea una orden, el comprador la aprueba en PayPal
// y al volver se captura (es decir, se cobra).
import { STATUS_PAGO } from '../../../dominio/pagos.js';

const API = { sandbox: 'https://api-m.sandbox.paypal.com', live: 'https://api-m.paypal.com' };
const MONEDA = 'MXN';

class ErrorPaypal extends Error {
  constructor(estado, detalle) {
    super(`PayPal respondió ${estado}: ${detalle}`);
    this.estado = estado;
  }
}

/** @returns {import('../../../puertos/salida.js').Pasarela} */
export function crearPasarelaPaypal({ clientId, clientSecret, entorno = 'sandbox' }) {
  const base = API[entorno] ?? API.sandbox;
  let acceso = { token: null, vence: 0 };

  // OAuth2 "client credentials": se cambia el id y el secreto por un token temporal, que se reutiliza hasta que vence.
  async function tokenDeAcceso() {
    if (acceso.token && Date.now() < acceso.vence) return acceso.token;
    const respuesta = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new ErrorPaypal(respuesta.status, datos.error_description ?? 'no aceptó las credenciales');
    acceso = { token: datos.access_token, vence: Date.now() + (datos.expires_in - 60) * 1000 };
    return acceso.token;
  }

  async function llamar(metodo, ruta, { cuerpo, idempotencia } = {}) {
    const respuesta = await fetch(base + ruta, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${await tokenDeAcceso()}`,
        'Content-Type': 'application/json',
        ...(idempotencia ? { 'PayPal-Request-Id': idempotencia } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new ErrorPaypal(respuesta.status, datos.details?.[0]?.issue ?? datos.message ?? 'sin detalle');
    return datos;
  }

  // Una orden COMPLETED todavia puede traer la captura pendiente o rechazada: manda el estado de la captura.
  function statusDe(orden) {
    if (orden.status === 'VOIDED') return STATUS_PAGO.CANCELADO;
    if (orden.status !== 'COMPLETED') return STATUS_PAGO.PENDIENTE;
    const captura = orden.purchase_units?.[0]?.payments?.captures?.[0]?.status;
    if (captura === 'COMPLETED') return STATUS_PAGO.APROBADO;
    if (captura === 'DECLINED' || captura === 'FAILED') return STATUS_PAGO.RECHAZADO;
    return STATUS_PAGO.PENDIENTE;
  }

  return {
    configurada: Boolean(clientId && clientSecret),
    cobraTarjetas: false,
    llavePublica: null,

    async crearLink(cobro) {
      const orden = await llamar('POST', '/v2/checkout/orders', {
        idempotencia: cobro.referencia,
        cuerpo: {
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: cobro.referencia,
              custom_id: cobro.referencia,
              description: cobro.descripcion,
              amount: { currency_code: MONEDA, value: cobro.monto.toFixed(2) },
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: 'EnCaja Autopartes',
                locale: 'es-MX',
                user_action: 'PAY_NOW',
                shipping_preference: 'NO_SHIPPING',
                return_url: cobro.urls.retorno,
                cancel_url: cobro.urls.retorno,
              },
            },
          },
        },
      });
      const enlace = orden.links?.find((link) => link.rel === 'payer-action') ?? orden.links?.find((link) => link.rel === 'approve');
      if (!enlace) throw new Error('PayPal no regresó el link para pagar');
      // PayPal no informa una fecha de vencimiento: la orden deja de existir sola si nadie la aprueba.
      return { status: STATUS_PAGO.PENDIENTE, idExterno: orden.id, url: enlace.href, codigo: null, vence: null, detalle: null };
    },

    async consultar(pago) {
      let orden;
      try {
        orden = await llamar('GET', `/v2/checkout/orders/${pago.idExterno}`);
      } catch (error) {
        if (error.estado === 404) return { status: STATUS_PAGO.CANCELADO, detalle: 'El link de PayPal venció sin pagarse.' };
        throw error;
      }

      // El comprador ya aprobo: falta capturar para que el dinero se mueva.
      if (orden.status === 'APPROVED') {
        try {
          orden = await llamar('POST', `/v2/checkout/orders/${pago.idExterno}/capture`, { idempotencia: `${pago.referencia}-captura` });
        } catch (error) {
          if (!error.estado) throw error;
          return { status: STATUS_PAGO.PENDIENTE, detalle: 'PayPal no pudo completar el cobro. Abre el link y vuelve a intentar.' };
        }
      }

      const status = statusDe(orden);
      return { status, detalle: status === STATUS_PAGO.RECHAZADO ? 'PayPal rechazó el cobro.' : null };
    },
  };
}
