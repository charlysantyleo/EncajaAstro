import { pesos } from '../../lib/formato';
import { useT } from '../../i18n/react';

// Precio de una pieza para quien la ve. Si su cuenta tiene precio de mayoreo (taller),
// se muestra ese y, tachado, el de lista. `cantidad` multiplica ambos (ficha con varias piezas).
export default function Precio({ producto, cantidad = 1, className }) {
  const t = useT();
  const paraTi = producto.precioParaTi ?? producto.precio;
  if (paraTi >= producto.precio) return <span className={className}>{pesos(producto.precio * cantidad)}</span>;
  return (
    <span className={['precio-taller', className].filter(Boolean).join(' ')}>
      <span>{pesos(paraTi * cantidad)}</span>
      <s className="precio-lista" aria-label={t('Precio de lista {precio}', { precio: pesos(producto.precio * cantidad) })}>
        {pesos(producto.precio * cantidad)}
      </s>
    </span>
  );
}
