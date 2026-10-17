import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rutas, navegar, volver, rutaActual } from '../lib/rutas';
import { imagenDe } from '../imagenes';

// Que pasa con cada evento:
//  - navegacion: cambia de pagina (cada pantalla ahora es una URL real).
//  - estado: cambia el store (modales, carrito, filtros).
// La API ir(evento, payload) se conserva para que los componentes casi no cambien.
export const useTienda = create(
  persist(
    (set, get) => ({
      modal: null,
      productoId: null,
      soloDirectos: false,
      pedidoConfirmado: null,
      aviso: null,

      version: 0,
      // Sesion: el JWT que regresa el backend y los datos del usuario. null = invitado.
      sesion: null,
      usuarioId: null,
      vehiculoActivo: null,
      carrito: [],

      iniciarSesion({ token, usuario }) {
        set({ sesion: { token, usuario }, usuarioId: usuario.id, modal: null });
      },

      // El servidor es quien sabe el rol vigente: si el admin lo cambio, se refleja aqui.
      actualizarUsuario(usuario) {
        const { sesion } = get();
        if (sesion) set({ sesion: { ...sesion, usuario: { ...sesion.usuario, ...usuario } } });
      },

      // Precios frescos del servidor (cambian si cambia el precio de lista o el rol de la cuenta).
      actualizarPrecios(precios) {
        set((estado) => ({
          carrito: estado.carrito.map((item) =>
            precios[item.productoId] != null && precios[item.productoId] !== item.precio ? { ...item, precio: precios[item.productoId] } : item
          ),
        }));
      },

      cerrarSesion() {
        // El garage es de la cuenta: al salir tambien se olvida el vehiculo activo.
        set({ sesion: null, usuarioId: null, vehiculoActivo: null, modal: null });
      },

      refrescar() {
        set((estado) => ({ version: estado.version + 1 }));
      },

      // La pagina de pago trae el pedido al dia (pagado, cancelado): se refleja en la confirmacion guardada.
      refrescarPedidoConfirmado(pedido) {
        if (get().pedidoConfirmado?.id === pedido.id) set({ pedidoConfirmado: pedido });
      },

      ir(evento, payload = {}) {
        switch (evento) {
          // --- navegacion ---
          case 'irAHome':
            set({ modal: null });
            return navegar(rutas.home);

          case 'elegirCategoria':
            set({ modal: null });
            return navegar(rutas.categoria(payload.categoriaId, payload.nombre));

          case 'irAGarage':
            set({ modal: null });
            return navegar(rutas.garage);

          case 'verVehiculo':
            set({ modal: null });
            return navegar(rutas.vehiculo(payload.vehiculoId));

          case 'irACarrito':
            set({ modal: null });
            return navegar(rutas.carrito);

          case 'finalizarCompra':
            set({ modal: null });
            return navegar(rutas.checkout);

          case 'buscar':
            if (payload.texto) return navegar(rutas.busqueda(payload.texto));
            if (rutaActual() === '/categoria') return navegar('/categoria');
            return undefined;

          case 'volver':
            set({ modal: null });
            return volver(payload.respaldo);

          // --- estado ---
          case 'verProducto':
            return set({ modal: 'producto', productoId: payload.productoId });

          case 'agregarAlCarrito': {
            const { producto } = payload;
            const { carrito } = get();
            const existente = carrito.find((item) => item.productoId === producto.id);
            // La nota nunca lleva mas piezas que las que hay: cuenta lo que ya estaba en ella,
            // sin importar desde donde se agregue (renglon del catalogo, ficha o cajon de la pieza).
            const caben = Math.max(0, (producto.stock ?? Infinity) - (existente?.cantidad ?? 0));
            const cantidad = Math.min(payload.cantidad, caben);
            if (cantidad === 0) {
              return set({
                aviso: { id: Date.now(), texto: `Tu nota ya lleva todas las existencias de ${producto.nombre} (${producto.stock})` },
              });
            }
            const nuevo = existente
              ? carrito.map((item) =>
                  item.productoId === producto.id ? { ...item, cantidad: item.cantidad + cantidad } : item
                )
              : [...carrito, {
                  productoId: producto.id,
                  nombre: producto.nombre,
                  numeroParte: producto.numeroParte,
                  imagen: imagenDe(producto),
                  // Lo que paga esta cuenta (de mayoreo si es taller); el servidor lo vuelve a calcular al cobrar.
                  precio: producto.precioParaTi ?? producto.precio,
                  cantidad,
                }];
            // Se queda en la pagina: la nota lateral y el aviso confirman el cambio.
            return set({
              carrito: nuevo,
              modal: null,
              productoId: null,
              aviso: {
                id: Date.now(),
                texto:
                  cantidad < payload.cantidad
                    ? `Solo quedaban ${cantidad} de ${producto.nombre}; se agregaron a tu nota`
                    : `${producto.nombre} agregado a tu nota`,
              },
            });
          }

          case 'cerrarAviso':
            return set({ aviso: null });

          // La confirmacion es la pagina de pago: ahi estan las instrucciones del metodo elegido.
          case 'pedidoCreado':
            set({ pedidoConfirmado: payload.pedido, carrito: [] });
            return navegar(rutas.pago(payload.pedido.pago.referencia));

          case 'cerrarConfirmacion':
            return set({ pedidoConfirmado: null });

          case 'abrirSelectorVehiculo':
            return set({ modal: 'selectorVehiculo' });

          // El garage y la bitacora piden cuenta: a un invitado se le abre primero "Entrar".
          case 'abrirAgregarVehiculo':
            return set({ modal: get().sesion ? 'agregarVehiculo' : 'entrar' });

          case 'abrirMantenimiento':
            return set({ modal: get().sesion ? 'mantenimiento' : 'entrar' });

          case 'abrirEntrar':
            return set({ modal: 'entrar' });

          case 'cerrarModal':
            return set({ modal: null, productoId: null });

          case 'alternarDirectos':
            return set((estado) => ({ soloDirectos: !estado.soloDirectos }));

          default:
            return undefined;
        }
      },

      elegirVehiculoActivo(vehiculo) {
        set({ vehiculoActivo: vehiculo, modal: null });
      },

      quitarVehiculoActivo() {
        set({ vehiculoActivo: null, modal: null });
      },

      cambiarCantidad(productoId, cantidad) {
        set((estado) => ({
          carrito:
            cantidad <= 0
              ? estado.carrito.filter((item) => item.productoId !== productoId)
              : estado.carrito.map((item) => (item.productoId === productoId ? { ...item, cantidad } : item)),
        }));
      },

      quitarDelCarrito(productoId) {
        set((estado) => ({ carrito: estado.carrito.filter((item) => item.productoId !== productoId) }));
      },
    }),
    {
      name: 'encaja-tienda',
      // v1: antes de la autenticacion todo usaba un usuario demo fijo; se descarta ese estado.
      version: 1,
      migrate: (guardado) => ({ ...guardado, usuarioId: null, vehiculoActivo: null, sesion: null }),
      // Ahora cada pantalla es una pagina distinta (recarga completa), asi que
      // lo que debe sobrevivir entre paginas se persiste aqui.
      partialize: (estado) => ({
        sesion: estado.sesion,
        usuarioId: estado.usuarioId,
        vehiculoActivo: estado.vehiculoActivo,
        carrito: estado.carrito,
        soloDirectos: estado.soloDirectos,
        pedidoConfirmado: estado.pedidoConfirmado,
      }),
    }
  )
);

// Selector: cuantas piezas de un producto lleva ya la nota. Uso: useTienda(enNota(producto.id)).
export const enNota = (productoId) => (estado) =>
  estado.carrito.find((item) => item.productoId === productoId)?.cantidad ?? 0;
