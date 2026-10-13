import { useState } from 'react';
import { Eye, EyeOff } from './Iconos';

// Campo de contraseña con boton para verla. Por defecto cada campo lleva su propio estado;
// con `visible` y `onAlternar` varios campos se muestran u ocultan juntos (contraseña y su confirmacion).
export default function CampoPassword({ id, etiqueta, ayuda, error, visible, onAlternar, ...input }) {
  const [propia, setPropia] = useState(false);
  const seVe = visible ?? propia;
  const alternar = onAlternar ?? (() => setPropia((valor) => !valor));
  const idNota = error || ayuda ? `${id}-nota` : undefined;

  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="campo-password">
        <input
          id={id}
          className="input"
          type={seVe ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={idNota}
          // Visible u oculta, sigue siendo una contraseña: sin autocorrector ni mayuscula inicial.
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          {...input}
        />
        <button
          type="button"
          className="btn-icono"
          aria-pressed={seVe}
          aria-label={seVe ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          title={seVe ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={alternar}
        >
          {seVe ? <EyeOff /> : <Eye />}
        </button>
      </div>
      {error ? (
        <span id={idNota} className="error" role="alert">
          {error}
        </span>
      ) : (
        ayuda && (
          <span id={idNota} className="apagado" style={{ fontSize: 12.5 }}>
            {ayuda}
          </span>
        )
      )}
    </div>
  );
}
