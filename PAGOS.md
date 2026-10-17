# Cobros en EnCaja: Mercado Pago + PayPal

## La idea en una frase

Al confirmar la compra se crea el pedido **y** su pago. El pedido nace `PENDIENTE` con las piezas apartadas; pasa a `PAGADO` cuando la pasarela confirma el cobro y a `CANCELADO` (con las piezas de vuelta al inventario) si el cobro se rechaza o vence.

## Formas de pago

| En el checkout | `MetodoPago` | Quién cobra | Qué recibe el comprador |
|---|---|---|---|
| Tarjeta de crédito o débito | `TARJETA` | Mercado Pago (Card Payment Brick + `POST /v1/payments`) | El cobro se hace al confirmar |
| Efectivo en tienda (OXXO, o 7-Eleven / Circle K / Soriana / Extra / Calimax) | `TIENDA` | Mercado Pago (`payment_method_id` `oxxo` o `paycash`) | Referencia y ficha para pagar en caja; vence en 3 días |
| Link de pago | `LINK` | Mercado Pago (Checkout Pro) **o** PayPal (Orders v2) | Un link para pagar o compartir |
| Pagar al recoger | `PICKUP` | Nadie: se cobra en mostrador | Su número de pedido |

Sin credenciales de una pasarela, sus métodos salen apagados en el checkout con el motivo ("Falta configurar Mercado Pago en el servidor") y el servidor los rechaza antes de crear el pedido. Pagar al recoger funciona siempre.

## Configurar

### 1. Crear la tabla `pago` (una sola vez)

Si tu base ya existía antes de este cambio:

```bash
cd back && npm run db:pagos
```

Una base nueva (`npm run db:init`) ya la trae.

El checkout también guarda cómo se entrega el pedido (tabla `entrega`) y las direcciones que cada cuenta decide conservar (tabla `direccion`). Si tu base es anterior a ese cambio, o corriste una versión anterior de este script:

```bash
cd back && npm run db:entregas
```

Reglas de entrega (todas en `back/src/dominio/entregas.js`):

- **Envío a domicilio**: $199, gratis si las piezas suman $999 o más (los dos montos se cambian en Panel → Ajustes). El envío se suma al total del pedido, que es lo que se cobra.
- **Cobertura**: solo los municipios de la zona metropolitana de Guadalajara. Fuera de ahí el pedido se rechaza y se sugiere recoger en mostrador.
- **Recoger en mostrador**: sin costo. Es la única entrega que admite "Pagar al recoger".
- **Direcciones guardadas**: solo con sesión, y solo si el comprador deja marcada la casilla. No se duplican.

### 2. Mercado Pago

1. Entra a https://www.mercadopago.com.mx/developers/panel/app y crea una aplicación.
2. En **Credenciales de prueba** copia el *Access Token* y la *Public Key* a `back/.env`:
   ```
   MP_ACCESS_TOKEN=TEST-...
   MP_PUBLIC_KEY=TEST-...
   ```
   El *Access Token* nunca sale del servidor. La *Public Key* sí llega al navegador (por `opcionesDePago`): con ella se tokeniza la tarjeta.
3. Para probar usa las tarjetas de prueba del mismo panel. **El resultado lo decide el nombre del titular**, no el número de tarjeta:

   | Nombre del titular | Resultado |
   |---|---|
   | `APRO` | Pago aprobado |
   | `CONT` | Pago pendiente (en revisión) |
   | `FUND` | Rechazado: fondos insuficientes |
   | `SECU` | Rechazado: código de seguridad inválido |
   | `EXPI` | Rechazado: fecha de vencimiento |
   | `CALL` | Rechazado: llamar al banco para autorizar |
   | `OTHE` o cualquier otro nombre | Rechazado: error general |

   Como correo del comprador usa uno cualquiera, pero no uno `@testuser.com`: con credenciales `TEST-` Mercado Pago responde "Invalid users involved". Evita también el correo de tu propia cuenta de Mercado Pago (no puedes pagarte a ti mismo).

### 3. PayPal

1. En https://developer.paypal.com/dashboard/applications/sandbox crea una app.
2. Copia *Client ID* y *Secret*:
   ```
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   PAYPAL_ENV=sandbox
   ```
   `PAYPAL_ENV=live` cobra de verdad.

### 4. Avisos de pago (webhook), para el efectivo

Quien paga en OXXO lo hace horas o días después. Mercado Pago avisa al servidor con un `POST /webhooks/mercadopago`, y para eso necesita una URL pública `https`:

```
BACK_URL_PUBLICA=https://tu-backend.com
MP_WEBHOOK_SECRET=<clave secreta del webhook, en Tus integraciones → Webhooks>
```

En local se puede abrir un túnel (por ejemplo `ngrok http 4000`) y poner esa URL. Sin `BACK_URL_PUBLICA` no hay avisos: el pago se confirma cuando alguien abre la página del pedido o pulsa **"Ya pagué, verificar"**.

## Pagar al recoger: código de mostrador

Al confirmar un pedido con "Pagar al recoger", el pago recibe un código de 8 caracteres (por ejemplo `K7M3-Q9TP`, sin letras que se confundan al dictarlas). El comprador lo ve en la página de su pedido. En mostrador, un empleado o un administrador entra al **Panel** → **Mostrador**, escribe el código (con o sin guion, en minúsculas o mayúsculas), revisa el pedido y, ya recibido el dinero, confirma el pago: el pedido queda **PAGADO** y el comprador lo ve así en su página.

## Cómo viaja un cobro

```
Checkout ──registrarPedido(pago: {...})──▶ Backend
                                            1. pagos.planear     ¿el método existe y está configurado?
                                            2. transacción       pedido + detalle + stock + pago PENDIENTE
                                            3. pagos.cobrar      tarjeta: cobra │ tienda: ficha │ link: URL
                                               └─ falla o rechaza → pedido CANCELADO, piezas de vuelta, error al comprador
           ◀── pedido con pago { referencia, url, codigo, vence } ──
/pago?ref=<referencia>   instrucciones según el método; al abrirla llama a verificarPago
```

- **`referencia`**: UUID aleatorio de cada pago. Es la llave de la página `/pago` (sirve igual a un invitado) y lo que se manda a la pasarela (`external_reference` en Mercado Pago, `custom_id` en PayPal) para reconocer el pedido cuando avisa.
- **`verificarPago(referencia)`**: pregunta a la pasarela cómo va el cobro y pone el pedido al día. Con PayPal también *captura* la orden que el comprador ya aprobó.
- **Webhook**: el aviso solo trae el id del pago en Mercado Pago. No se le cree al aviso: se comprueba su firma (`x-signature`) y después se le pregunta a la API a qué referencia pertenece y en qué estado está.
- **El total lo pone el servidor**: se cobra `pedido.total`, calculado con los precios de la base, nunca un monto mandado por el navegador.
- **El número de tarjeta no pasa por EnCaja**: los campos son de Mercado Pago y al backend solo llega un token de un solo uso.

## Dónde está cada cosa

| Qué | Archivo |
|---|---|
| Reglas: métodos, qué pasarela atiende cuál, vencimiento | `back/src/dominio/pagos.js` |
| Casos de uso: opciones, cobrar, verificar, aviso | `back/src/aplicacion/pagos.js` |
| Contrato `Pasarela` | `back/src/puertos/salida.js` |
| Mercado Pago / PayPal | `back/src/adaptadores/salida/pagos/` |
| Webhook | `back/src/adaptadores/entrada/http/rutasPagos.js` |
| Checkout y formas de pago | `front/src/components/CheckoutView.jsx`, `MetodosPago.jsx`, `TarjetaMercadoPago.jsx` |
| Página del pedido y su pago | `front/src/pages/pago.astro`, `front/src/components/PagoView.jsx` |

Cambiar de pasarela es escribir otro adaptador con la forma de `Pasarela` y cambiar una línea en `back/src/contenedor.js`.

## Pendientes conocidos

- **Pedidos sin pagar que nadie vuelve a abrir**: sus piezas siguen apartadas hasta que llegue un aviso o alguien verifique. Falta una tarea programada que revise los pagos vencidos.
- **Reembolsos y contracargos** no se reflejan: un pago aprobado se queda aprobado.
- **PayPal no tiene webhook**: el cobro se captura cuando el comprador vuelve a `/pago` o pulsa verificar.
