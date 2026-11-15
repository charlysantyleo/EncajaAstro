import { useState } from 'react';
import { graphqlRequest } from '../../graphql/client';
import { MUTATION_CLAVE_SAT, QUERY_FACTURACION_PANEL } from '../../graphql/queries';
import { useGraphQLQuery } from '../../hooks/useGraphQLQuery';
import { Cargando } from '../EstadoCarga';

// Clave SAT de un sistema: se escribe y se guarda en su renglon.
function ClaveSat({ categoria, onGuardada }) {
  const [clave, setClave] = useState(categoria.claveSat);
  const [estado, setEstado] = useState(null);
  const cambio = clave !== categoria.claveSat;

  async function guardar(evento) {
    evento.preventDefault();
    setEstado('guardando');
    try {
      const { cambiarClaveSatDeCategoria } = await graphqlRequest(MUTATION_CLAVE_SAT, { id: categoria.id, claveSat: clave });
      onGuardada(cambiarClaveSatDeCategoria);
      setEstado('listo');
    } catch (err) {
      setEstado(err.message);
    }
  }

  return (
    <li className="ajuste clave-sat">
      <span>{categoria.nombre}</span>
      <form onSubmit={guardar}>
        <input
          className="input mono"
          inputMode="numeric"
          maxLength={8}
          aria-label={`Clave SAT de ${categoria.nombre}`}
          value={clave}
          onChange={(e) => {
            setClave(e.target.value.replace(/\D/g, '').slice(0, 8));
            setEstado(null);
          }}
        />
        <button className="btn btn-secundario btn-chico" type="submit" disabled={!cambio || clave.length !== 8 || estado === 'guardando'}>
          Guardar
        </button>
      </form>
      {clave === '01010101' && <span className="ajuste-nota">01010101 = “No existe en el catálogo”. Búscala en el catálogo del SAT.</span>}
      {estado && estado !== 'guardando' && estado !== 'listo' && <span className="ajuste-nota error">{estado}</span>}
    </li>
  );
}

// Estado de la facturacion (datos fiscales y CSD vienen de variables de entorno del servidor) y claves SAT por sistema.
export default function FacturacionAjustes({ categorias, onCategoria }) {
  const { datos, cargando } = useGraphQLQuery(QUERY_FACTURACION_PANEL);
  const f = datos?.facturacion;

  return (
    <section className="hoja admin-seccion" aria-labelledby="facturacion-titulo">
      <h4 id="facturacion-titulo">Facturación (CFDI 4.0)</h4>
      {cargando || !f ? (
        <Cargando filas={2} alto={40} />
      ) : (
        <dl className="detalle-datos">
          <div>
            <dt>Datos fiscales de la tienda</dt>
            <dd>
              {f.emisor ? (
                <>
                  {f.emisor.nombre} · RFC <span className="mono">{f.emisor.rfc}</span>
                  <div className="apagado">
                    Régimen {f.emisor.regimenFiscal} ({f.emisor.regimenFiscalNombre}) · C.P. {f.emisor.codigoPostal}
                  </div>
                </>
              ) : (
                <span className="error">{f.motivo}</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Sello (CSD)</dt>
            <dd>
              {f.sellado ? (
                <>
                  Certificado <span className="mono">{f.noCertificado}</span>
                  <div className="apagado">Vence el {f.venceCsd}</div>
                </>
              ) : (
                <span className="apagado">{f.emisor ? f.motivo : 'Primero los datos fiscales.'}</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Timbrado</dt>
            <dd className="apagado">Sin PAC: las facturas quedan selladas pero sin timbrar (sin validez fiscal).</dd>
          </div>
        </dl>
      )}

      <div>
        <h5 style={{ margin: '8px 0 4px' }}>Clave SAT de cada sistema</h5>
        <p className="apagado" style={{ margin: 0 }}>
          Con esta clave de producto o servicio se facturan las piezas de cada sistema.
        </p>
      </div>
      <ul className="ajustes">
        {categorias.map((categoria) => (
          <ClaveSat key={categoria.id} categoria={categoria} onGuardada={onCategoria} />
        ))}
      </ul>
    </section>
  );
}
