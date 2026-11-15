// Genera las miniaturas del catalogo: public/img/placa/*.webp (960×720) -> public/img/mini/*.webp (192×144).
// En la lista cada foto se ve a 96×72; 192×144 cubre pantallas de doble densidad y pesa una fraccion.
// Uso: node scripts/miniaturas.mjs   (correrlo de nuevo al agregar fotos a public/img/placa)
import { mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const PUBLICO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'img');
const origen = path.join(PUBLICO, 'placa');
const destino = path.join(PUBLICO, 'mini');
mkdirSync(destino, { recursive: true });

for (const archivo of readdirSync(origen).filter((a) => a.endsWith('.webp'))) {
  const salida = path.join(destino, archivo);
  const { size } = await sharp(path.join(origen, archivo)).resize(192, 144, { fit: 'cover' }).webp({ quality: 78 }).toFile(salida);
  console.log(`${archivo}: ${Math.round(size / 1024)} KB`);
}
