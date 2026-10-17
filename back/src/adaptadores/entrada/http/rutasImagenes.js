// Adaptador de entrada HTTP: sirve las fotos de producto que el administrador sube desde el panel.
// Una foto nunca cambia (subir otra crea otra), asi que el navegador puede guardarla en cache para siempre.
import express from 'express';

export function crearRutasImagenes({ catalogo }) {
  const rutas = express.Router();

  rutas.get('/imagenes/:id', async (req, res) => {
    if (!/^\d+$/.test(req.params.id)) return res.sendStatus(404);
    try {
      const imagen = await catalogo.imagen(req.params.id);
      if (!imagen) return res.sendStatus(404);
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      return res.type(imagen.tipo).send(imagen.datos);
    } catch (error) {
      console.error('[imagenes] No se pudo leer la imagen:', error.message);
      return res.sendStatus(500);
    }
  });

  return rutas;
}
