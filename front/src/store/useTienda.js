import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rutas, navegar, volver, rutaActual } from '../lib/rutas';

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

      cerrarSesion() {
        // El garage es de la cuenta: al salir tambien se olvida el vehiculo activo.
        set({ sesion: null, usuarioId: null, vehiculoActivo: null, modal: null });
      },

      refrescar() {
        set((estado) => ({ version: estado.version + 1 }));
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
            const { producto, cantidad } = payload;
            const { carrito } = get();
            const existente = carrito.find((item) => item.productoId === producto.id);
            const nuevo = existente
              ? carrito.map((item) =>
                  item.productoId === producto.id ? { ...item, cantidad: item.cantidad + cantidad } : item
                )
              : [...carrito, {
                  productoId: producto.id,
                  nombre: producto.nombre,
                  numeroParte: producto.numeroParte,
                  precio: producto.precio,
                  cantidad,
                }];
            // Se queda en la pagina: la nota lateral y el aviso confirman el cambio.
            return set({
              carrito: nuevo,
              modal: null,
              productoId: null,
              aviso: { id: Date.now(), texto: `${producto.nombre} agregado a tu nota` },
            });
          }

          case 'cerrarAviso':
            return set({ aviso: null });

          case 'pedidoCreado':
            set({ pedidoConfirmado: payload.pedido, carrito: [] });
            return navegar(rutas.home);

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
