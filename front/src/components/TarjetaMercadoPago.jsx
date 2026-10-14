import { useEffect, useId, useState } from 'react';
import { temaActual } from '../lib/tema';
import { Cargando } from './EstadoCarga';

const SDK = 'https://sdk.mercadopago.com/js/v2';
let sdkCargando = null;

// El script de Mercado Pago se descarga hasta que alguien elige pagar con tarjeta, y una sola vez.
function cargarSdk() {
  if (window.MercadoPago) return Promise.resolve();
  sdkCargando ??= new Promise((listo, fallo) => {
    const script = document.createElement('script');
    script.src = SDK;
    script.onload = listo;
    script.onerror = () => {
      sdkCargando = null;
      script.remove();
      fallo(new Error('No se pudo cargar Mercado Pago'));
    };
    document.head.append(script);
  });
  return sdkCargando;
}

// Formulario de tarjeta de Mercado Pago (Card Payment Brick). Los campos son de Mercado Pago:
// el numero de tarjeta nunca toca esta pagina ni nuestro servidor, solo recibimos un token de un solo uso.
// `control.current.pedirToken()` valida el formulario y regresa lo que hay que mandar al backend,
// o lanza un error con el motivo.
//
// `email` debe ser un correo completo y valido (ver ES_CORREO en lib/pagos.js): con el correo el formulario
// oculta su propio campo de correo, pero lo sigue validando al cobrar; uno a medias falla sin mostrar nada.
export default function TarjetaMercadoPago({ llavePublica, monto, email, control }) {
  const id = `tarjeta-${useId().replaceAll(':', '')}`;
  const [estado, setEstado] = useState('cargando');

  useEffect(() => {
    let vigente = true;
    let brick = null;
    // Ultimo aviso del formulario (campos incompletos, token rechazado): es el motivo cuando no entrega token.
    let aviso = null;
    setEstado('cargando');

    cargarSdk()
      .then(async () => {
        if (!vigente) return;
        const mp = new window.MercadoPago(llavePublica, { locale: 'es-MX' });
        brick = await mp.bricks().create('cardPayment', id, {
          initialization: { amount: monto, payer: { email } },
          customization: {
            visual: {
              hideFormTitle: true,
              // El boton de pagar es el del checkout: asi hay un solo "confirmar" para todos los metodos.
              hidePaymentButton: true,
              style: { theme: temaActual() === 'oscuro' ? 'dark' : 'default' },
            },
            paymentMethods: { maxInstallments: 12 },
          },
          callbacks: {
            onReady: () => vigente && setEstado('listo'),
            onSubmit: () => Promise.resolve(),
            onError: (error) => {
              console.error('[Mercado Pago]', error);
              aviso = error;
              // Los errores "non_critical" son avisos de validacion que el propio formulario ya muestra.
              if (vigente && error?.type !== 'non_critical') setEstado('error');
            },
          },
        });
        // Con una llave publica invalida el SDK no lanza error ni llama a onError: regresa un control vacio.
        if (!brick?.getFormData) throw new Error('Mercado Pago no inicio el formulario; revisa MP_PUBLIC_KEY en el servidor');
        if (!vigente) return brick.unmount();

        control.current = {
          async pedirToken() {
            aviso = null;
            const datos = await brick.getFormData().catch(() => null);
            if (!datos?.token) {
              throw new Error(
                aviso?.cause === 'incomplete_fields'
                  ? 'Completa los datos de tu tarjeta para continuar.'
                  : 'Mercado Pago no pudo validar la tarjeta. Revisa los datos e intenta de nuevo.'
              );
            }
            return {
              token: datos.token,
              metodoId: datos.payment_method_id,
              emisorId: datos.issuer_id ? String(datos.issuer_id) : null,
              cuotas: Number(datos.installments) || 1,
            };
          },
        };
        return undefined;
      })
      .catch((error) => {
        console.error('[Mercado Pago]', error);
        if (vigente) setEstado('error');
      });

    return () => {
      vigente = false;
      control.current = null;
      brick?.unmount?.();
    };
  }, [id, llavePublica, monto, email, control]);

  return (
    <div className="tarjeta" aria-busy={estado === 'cargando'}>
      {estado === 'cargando' && <Cargando filas={3} alto={48} />}
      {estado === 'error' && (
        <p className="error" role="alert">
          No se pudo cargar el formulario de tarjeta. Revisa tu conexión o elige otra forma de pago.
        </p>
      )}
      <div id={id} hidden={estado === 'error'} />
    </div>
  );
}
