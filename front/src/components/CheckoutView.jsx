import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, TriangleAlert, Loader2 } from './ui/Iconos';
import { useTienda } from '../store/useTienda';
import { graphqlRequest } from '../graphql/client';
import { MUTATION_REGISTRAR_PEDIDO } from '../graphql/queries';
import { useOpcionesDePago } from '../hooks/useCatalogo';
import { useStockDeNota } from '../hooks/useStockDeNota';
import { pesos } from '../lib/formato';
import { ES_CORREO, METODOS, pagoParaEnviar } from '../lib/pagos';
import { Importe, Interruptor } from './ui/Movimiento';
import { Cargando, ErrorConReintento } from './EstadoCarga';
import MetodosPago, { eleccionInicial } from './MetodosPago';
import { comoIsla } from './ui/Isla';

// El formulario de tarjeta (y el script de Mercado Pago que carga) solo se baja si se elige ese metodo.
const TarjetaMercadoPago = lazy(() => import('./TarjetaMercadoPago'));

function CheckoutView() {
  const carrito = useTienda((estado) => estado.carrito);
  const vehiculoActivo = useTienda((estado) => estado.vehiculoActivo);
  const ir = useTienda((estado) => estado.ir);
  const sesion = useTienda((estado) => estado.sesion);

  const [nombre, setNombre] = useState(sesion?.usuario.nombre ?? '');
  const [email, setEmail] = useState(sesion?.usuario.email ?? '');
  const [usarVehiculo, setUsarVehiculo] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const { opciones, cargando: cargandoOpciones, error: errorOpciones, recargar } = useOpcionesDePago();
  const [eleccion, setEleccion] = useState(null);
  const tarjeta = useRef(null);
  // Correo con el que se monta el formulario de tarjeta. Tiene que ser el correo TERMINADO: si se le pasa
  // a medio teclear ("ana@gmail.c"), el formulario lo da por bueno, oculta su campo y despues no deja cobrar.
  // Por eso se toma al salir del campo de correo, no en cada tecla. Si el comprador lo corrige despues,
  // el formulario se vuelve a montar con el nuevo.
  const [emailTarjeta, setEmailTarjeta] = useState(null);
  const confirmarCorreo = () => {
    if (ES_CORREO.test(email)) setEmailTarjeta(email);
  };

  // A pagar se llega tambien directo desde la franja de la nota, sin pasar por el carrito:
  // aqui se vuelve a revisar que haya existencias para todo antes de dejar confirmar.
  const { revisando, excesos } = useStockDeNota(carrito);

  const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
  const metodo = eleccion?.metodo;
  const conTarjeta = metodo === 'TARJETA';
  const llavePublica = opciones.find((opcion) => opcion.metodo === 'TARJETA')?.llavePublica;

  useEffect(() => {
    if (!eleccion && opciones.length) setEleccion(eleccionInicial(opciones));
  }, [opciones, eleccion]);

  // Correo que ya estaba listo sin pasar por el campo: el de la sesion, o el que relleno el navegador.
  useEffect(() => {
    const tecleando = document.activeElement?.id === 'checkout-email';
    if (conTarjeta && !tecleando && ES_CORREO.test(email)) setEmailTarjeta(email);
  }, [conTarjeta, email]);

  async function manejarConfirmar(evento) {
    evento.preventDefault();
    if (revisando || excesos.length > 0) return;
    setEnviando(true);
    setError(null);
    try {
      let datosTarjeta = null;
      if (conTarjeta) {
        // Enter dentro del campo de correo manda el formulario sin salir del campo: se confirma aqui.
        confirmarCorreo();
        if (!tarjeta.current) throw new Error('Llena los datos de tu tarjeta para pagar.');
        datosTarjeta = await tarjeta.current.pedirToken();
        // Sin token no hay nada que cobrar: no se manda el pedido.
        if (!datosTarjeta?.token) throw new Error('Completa los datos de tu tarjeta para continuar.');
      }
      const datos = await graphqlRequest(MUTATION_REGISTRAR_PEDIDO, {
        datos: {
          cliente: { nombre, email },
          vehiculoId: usarVehiculo && vehiculoActivo ? vehiculoActivo.id : null,
          items: carrito.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad })),
          pago: pagoParaEnviar(eleccion, datosTarjeta),
        },
      });
      ir('pedidoCreado', { pedido: datos.registrarPedido });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  const textoBoton = !metodo ? 'Confirmar pedido' : conTarjeta ? `${METODOS.TARJETA.accion} ${pesos(total)}` : METODOS[metodo].accion;

  return (
    <div className="contenedor" style={{ maxWidth: 1180 }}>
      <button className="enlace-volver" onClick={() => ir('irACarrito')}>
        <ArrowLeft size={18} /> Volver a la nota
      </button>

      <div className="encabezado-pagina">
        <h1>Finalizar compra</h1>
      </div>

      <div className="carrito">
        <form className="formulario" onSubmit={manejarConfirmar}>
          <section className="hoja formulario">
            <h4>Tus datos</h4>

            <div className="campos-2">
              <div className="campo">
                <label htmlFor="checkout-nombre">Nombre</label>
                <input
                  id="checkout-nombre"
                  className="input"
                  required
                  autoComplete="name"
                  value={nombre}
                  onChange={(evento) => setNombre(evento.target.value)}
                />
              </div>

              <div className="campo">
                <label htmlFor="checkout-email">Correo</label>
                <input
                  id="checkout-email"
                  className="input"
                  required
                  type="email"
                  autoComplete="email"
                  readOnly={Boolean(sesion)}
                  title={sesion ? 'El pedido queda a nombre de tu cuenta' : undefined}
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  onBlur={confirmarCorreo}
                />
              </div>
            </div>

            {vehiculoActivo && (
              <Interruptor activo={usarVehiculo} onCambio={setUsarVehiculo}>
                Validar compatibilidad con mi {vehiculoActivo.marca} {vehiculoActivo.modelo} {vehiculoActivo.anio}
              </Interruptor>
            )}
          </section>

          <section className="hoja formulario">
            <h4>Forma de pago</h4>

            {errorOpciones ? (
              <ErrorConReintento mensaje="No se pudieron cargar las formas de pago." onReintentar={recargar} />
            ) : (
              <MetodosPago opciones={opciones} cargando={cargandoOpciones} valor={eleccion} onCambio={setEleccion}>
                {conTarjeta &&
                  total > 0 &&
                  (emailTarjeta ? (
                    <Suspense fallback={<Cargando filas={3} alto={48} />}>
                      <TarjetaMercadoPago llavePublica={llavePublica} monto={total} email={emailTarjeta} control={tarjeta} />
                    </Suspense>
                  ) : (
                    <p className="apagado" style={{ margin: 0 }}>
                      Termina de escribir tu correo arriba y aquí aparece el formulario de la tarjeta.
                    </p>
                  ))}
              </MetodosPago>
            )}
          </section>

          {excesos.length > 0 && (
            <div className="aviso-fila" role="alert" style={{ flexDirection: 'column' }}>
              <span style={{ display: 'flex', gap: 8 }}>
                <TriangleAlert size={18} style={{ flex: 'none', marginTop: 2 }} />
                No hay existencias para todo tu pedido:
              </span>
              <ul style={{ margin: 0, paddingLeft: 44 }}>
                {excesos.map((item) => (
                  <li key={item.productoId}>
                    {item.nombre}: pides {item.cantidad} y {item.disponible === 0 ? 'ya se agotó' : item.disponible === 1 ? 'solo queda 1' : `solo quedan ${item.disponible}`}.
                  </li>
                ))}
              </ul>
              <button className="btn btn-secundario btn-chico" type="button" style={{ marginLeft: 26 }} onClick={() => ir('irACarrito')}>
                Ajustar mi nota
              </button>
            </div>
          )}

          <AnimatePresence>
            {error && (
              <motion.p
                className="aviso-fila"
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <TriangleAlert size={18} style={{ flex: 'none', marginTop: 2 }} /> {error}
              </motion.p>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secundario" type="button" onClick={() => ir('irACarrito')}>
              Volver a la nota
            </button>
            <button
              className="btn btn-primario btn-isla"
              type="submit"
              disabled={enviando || revisando || excesos.length > 0 || carrito.length === 0 || !metodo}
            >
              {enviando ? 'Confirmando…' : revisando ? 'Revisando existencias…' : textoBoton}
              <span className="btn-isla-icono" aria-hidden="true">
                {enviando ? <Loader2 size={16} className="girar" /> : <ArrowRight size={16} />}
              </span>
            </button>
          </div>
        </form>

        <aside className="nota" aria-label="Resumen del pedido">
          <div className="nota-cab">
            <h4>Resumen</h4>
          </div>
          <ul className="nota-lineas">
            {carrito.map((item) => (
              <li key={item.productoId} className="nota-linea" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
                <span className="nota-linea-cant">{item.cantidad}×</span>
                <span className="nota-linea-nombre">{item.nombre}</span>
                <span className="nota-linea-importe">{pesos(item.precio * item.cantidad)}</span>
              </li>
            ))}
          </ul>
          <div className="nota-total">
            <span>Total</span>
            <strong>
              <Importe valor={total} />
            </strong>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default comoIsla(CheckoutView);
