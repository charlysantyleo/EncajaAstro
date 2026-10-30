// Indicador del WebSocket del panel: si lo que se ve se actualiza solo o hay que recargar.
const TEXTOS = {
  conectando: 'Conectando…',
  'en-vivo': 'En vivo',
  'sin-conexion': 'Sin conexión, reintentando',
  'sin-permiso': 'Sin actualización en vivo',
};

export default function EnVivo({ estado }) {
  return (
    <span className={`en-vivo ${estado}`} role="status">
      <span className="en-vivo-punto" aria-hidden="true" />
      {TEXTOS[estado] ?? estado}
    </span>
  );
}
