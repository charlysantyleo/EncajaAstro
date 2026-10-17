CREATE TABLE usuario (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  rol TEXT NOT NULL DEFAULT 'CLIENTE'
);

CREATE TABLE categoria (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT
);

CREATE TABLE producto (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  numero_parte TEXT NOT NULL,
  marca TEXT,
  precio NUMERIC(10, 2) NOT NULL,
  imagen TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  categoria_id INTEGER REFERENCES categoria(id)
);

CREATE TABLE vehiculo (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuario(id),
  apodo TEXT,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  motor TEXT,
  tipo_combustible TEXT NOT NULL DEFAULT 'GASOLINA',
  kilometraje INTEGER
);

-- Catalogo compartido de vehiculos que se venden en Mexico: una fila por marca, modelo y año.
-- Se llena con "npm run db:vehiculos" (datos/vehiculos.json: INEGI, NHTSA y FuelEconomy.gov) y desde el panel.
CREATE TABLE catalogo_vehiculo (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER NOT NULL,
  motores TEXT[] NOT NULL DEFAULT '{}',
  origen TEXT NOT NULL DEFAULT 'PANEL'
);
CREATE UNIQUE INDEX catalogo_vehiculo_clave ON catalogo_vehiculo (lower(marca), lower(modelo), anio);

-- En que vehiculos embona una pieza: un modelo en un rango de años y, si importa, un motor (NULL = cualquiera).
-- Aplica a todo coche del garage con esa marca, modelo y año.
CREATE TABLE compatibilidad (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES producto(id),
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio_desde INTEGER NOT NULL,
  anio_hasta INTEGER NOT NULL,
  motor TEXT,
  tipo TEXT NOT NULL DEFAULT 'DIRECTO',
  nota TEXT,
  CHECK (anio_desde <= anio_hasta)
);
CREATE INDEX compatibilidad_modelo ON compatibilidad (lower(marca), lower(modelo));

CREATE TABLE pedido (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  vehiculo_id INTEGER REFERENCES vehiculo(id),
  fecha TEXT NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDIENTE'
);

CREATE TABLE detalle_pedido (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedido(id),
  producto_id INTEGER NOT NULL REFERENCES producto(id),
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC(10, 2) NOT NULL,
  importe NUMERIC(10, 2) NOT NULL
);

CREATE TABLE pago (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id INTEGER NOT NULL UNIQUE REFERENCES pedido(id),
  referencia TEXT NOT NULL UNIQUE,
  metodo TEXT NOT NULL,
  proveedor TEXT,
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  monto NUMERIC(10, 2) NOT NULL,
  id_externo TEXT,
  url TEXT,
  codigo TEXT,
  vence TEXT,
  detalle TEXT
);

CREATE TABLE entrega (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id INTEGER NOT NULL UNIQUE REFERENCES pedido(id),
  tipo TEXT NOT NULL,
  telefono TEXT,
  costo NUMERIC(10, 2) NOT NULL DEFAULT 0,
  calle TEXT,
  numero_exterior TEXT,
  numero_interior TEXT,
  colonia TEXT,
  codigo_postal TEXT,
  ciudad TEXT,
  estado TEXT,
  referencias TEXT
);

CREATE TABLE direccion (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id),
  telefono TEXT NOT NULL,
  calle TEXT NOT NULL,
  numero_exterior TEXT NOT NULL,
  numero_interior TEXT,
  colonia TEXT NOT NULL,
  codigo_postal TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  estado TEXT NOT NULL,
  referencias TEXT
);

CREATE TABLE ajuste (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE imagen (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo TEXT NOT NULL,
  datos BYTEA NOT NULL,
  creada TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mantenimiento (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehiculo_id INTEGER NOT NULL REFERENCES vehiculo(id),
  producto_id INTEGER REFERENCES producto(id),
  pedido_id INTEGER REFERENCES pedido(id),
  fecha TEXT NOT NULL,
  kilometraje INTEGER,
  descripcion TEXT NOT NULL
);

INSERT INTO usuario (nombre, email, password, rol) VALUES
  ('Santiago Castaneda', 'santiago@encaja.mx', '$2b$10$lh53eU/s1eC3KuE02cy/hOzHahHAiXlFDba8vYu5VM1OVBMLxaIy2', 'CLIENTE'),
  ('Raul Esau Garcia', 'raul@encaja.mx', '$2b$10$lh53eU/s1eC3KuE02cy/hOzHahHAiXlFDba8vYu5VM1OVBMLxaIy2', 'CLIENTE'),
  ('Taller El Tornillo', 'taller@encaja.mx', '$2b$10$lh53eU/s1eC3KuE02cy/hOzHahHAiXlFDba8vYu5VM1OVBMLxaIy2', 'TALLER'),
  ('Administracion EnCaja', 'admin@encaja.mx', '$2b$10$lh53eU/s1eC3KuE02cy/hOzHahHAiXlFDba8vYu5VM1OVBMLxaIy2', 'ADMIN'),
  ('Mostrador EnCaja', 'mostrador@encaja.mx', '$2b$10$lh53eU/s1eC3KuE02cy/hOzHahHAiXlFDba8vYu5VM1OVBMLxaIy2', 'EMPLEADO');

INSERT INTO categoria (nombre, descripcion) VALUES
  ('Frenos', 'Balatas, discos y componentes del sistema de frenado'),
  ('Filtros', 'Filtros de aceite, aire y cabina'),
  ('Suspension', 'Amortiguadores, resortes y direccion'),
  ('Motor', 'Bujias, bandas y componentes internos'),
  ('Enfriamiento', 'Bombas de agua, termostatos y mangueras'),
  ('Electrico', 'Baterias, alternadores e iluminacion');

INSERT INTO producto (nombre, descripcion, numero_parte, marca, precio, imagen, stock, categoria_id) VALUES
  ('Balatas delanteras ceramicas', 'Juego de balatas delanteras de alto rendimiento, bajo ruido y poco polvo.', 'BC-4021', 'Brembo', 649.00, NULL, 20, 1),
  ('Balatas traseras semi-metalicas', 'Juego de balatas traseras de larga duracion.', 'BC-4099', 'ACT', 459.00, NULL, 25, 1),
  ('Disco de freno ventilado', 'Disco delantero ventilado, se vende por pieza.', 'DF-1187', 'Brembo', 890.50, NULL, 12, 1),
  ('Filtro de aceite', 'Filtro de aceite de rosca con valvula antirretorno.', 'FA-0231', 'Mann', 149.00, NULL, 40, 2),
  ('Filtro de aire', 'Filtro de aire de panel, alto flujo.', 'FA-0450', 'Mann', 199.00, NULL, 35, 2),
  ('Filtro de cabina', 'Filtro de polen y polvo para el habitaculo.', 'FA-0512', 'Bosch', 179.00, NULL, 30, 2),
  ('Amortiguador delantero', 'Amortiguador a gas, delantero, se vende por pieza.', 'AM-3301', 'KYB', 1250.00, NULL, 8, 3),
  ('Amortiguador trasero', 'Amortiguador a gas, trasero, se vende por pieza.', 'AM-3302', 'KYB', 1120.00, NULL, 8, 3),
  ('Terminal de direccion', 'Terminal exterior de la barra de direccion.', 'TD-0871', 'Moog', 385.00, NULL, 15, 3),
  ('Bujia de iridio', 'Bujia de encendido de iridio, se vende por pieza.', 'BJ-1002', 'NGK', 129.00, NULL, 50, 4),
  ('Banda de distribucion', 'Kit de banda de distribucion con tensor.', 'BD-2210', 'Gates', 899.00, NULL, 10, 4),
  ('Bomba de agua', 'Bomba de agua del sistema de enfriamiento.', 'BA-3120', 'Gates', 675.00, NULL, 10, 5),
  ('Termostato', 'Termostato con empaque incluido.', 'TM-0044', 'Gates', 245.00, NULL, 18, 5),
  ('Bateria 12V 45Ah', 'Bateria libre de mantenimiento, 12V 45Ah.', 'BT-4500', 'LTH', 2199.00, NULL, 6, 6),
  ('Alternador remanufacturado', 'Alternador remanufacturado con garantia de un ano.', 'AL-7701', 'Bosch', 2450.00, NULL, 5, 6),
  ('Foco H4', 'Foco halogeno H4, se vende por par.', 'FH-0100', 'Philips', 219.00, NULL, 40, 6);

INSERT INTO vehiculo (usuario_id, apodo, marca, modelo, anio, motor, tipo_combustible, kilometraje) VALUES
  (1, 'El azul', 'Nissan', 'Versa', 2018, '1.6L 4 cil.', 'GASOLINA', 82000),
  (1, 'El de trabajo', 'Volkswagen', 'Jetta', 2016, '1.4L 4 cil. turbo', 'GASOLINA', 143000),
  (2, NULL, 'Chevrolet', 'Aveo', 2019, '1.5L 4 cil.', 'GASOLINA', 60000),
  (2, 'El nuevo', 'Toyota', 'Corolla', 2022, '1.8L 4 cil. híbrido', 'HIBRIDO', 21000),
  (3, NULL, 'Nissan', 'Versa', 2021, '1.6L 4 cil.', 'GASOLINA', 34000);

INSERT INTO compatibilidad (producto_id, marca, modelo, anio_desde, anio_hasta, motor, tipo, nota) VALUES
  (1, 'Nissan', 'Versa', 2012, 2019, NULL, 'DIRECTO', 'Ajuste original de fabrica'),
  (3, 'Nissan', 'Versa', 2012, 2019, NULL, 'EQUIVALENCIA', 'Equivale al disco original, verificar espesor minimo'),
  (4, 'Nissan', 'Versa', 2012, 2019, NULL, 'DIRECTO', NULL),
  (5, 'Nissan', 'Versa', 2012, 2019, NULL, 'DIRECTO', NULL),
  (7, 'Nissan', 'Versa', 2012, 2019, NULL, 'DIRECTO', 'Se requieren dos piezas'),
  (10, 'Nissan', 'Versa', 2012, 2019, '1.6L 4 cil.', 'DIRECTO', 'Se requieren cuatro piezas'),
  (14, 'Nissan', 'Versa', 2012, 2019, NULL, 'DIRECTO', NULL),
  (16, 'Nissan', 'Versa', 2012, 2019, NULL, 'DIRECTO', NULL),
  (2, 'Volkswagen', 'Jetta', 2011, 2018, NULL, 'DIRECTO', NULL),
  (4, 'Volkswagen', 'Jetta', 2011, 2018, NULL, 'DIRECTO', NULL),
  (5, 'Volkswagen', 'Jetta', 2011, 2018, NULL, 'DIRECTO', NULL),
  (8, 'Volkswagen', 'Jetta', 2011, 2018, NULL, 'DIRECTO', NULL),
  (11, 'Volkswagen', 'Jetta', 2011, 2018, NULL, 'DIRECTO', 'Cambio recomendado cada 80,000 km'),
  (12, 'Volkswagen', 'Jetta', 2011, 2018, NULL, 'DIRECTO', NULL),
  (1, 'Chevrolet', 'Aveo', 2018, 2023, NULL, 'EQUIVALENCIA', 'Misma medida, cambia el sensor de desgaste'),
  (4, 'Chevrolet', 'Aveo', 2018, 2023, NULL, 'DIRECTO', NULL),
  (5, 'Chevrolet', 'Aveo', 2018, 2023, NULL, 'DIRECTO', NULL),
  (9, 'Chevrolet', 'Aveo', 2018, 2023, NULL, 'DIRECTO', NULL),
  (10, 'Chevrolet', 'Aveo', 2018, 2023, NULL, 'EQUIVALENCIA', 'Compatible con la misma rosca'),
  (6, 'Toyota', 'Corolla', 2020, 2025, NULL, 'DIRECTO', NULL),
  (12, 'Toyota', 'Corolla', 2020, 2025, NULL, 'DIRECTO', NULL),
  (13, 'Toyota', 'Corolla', 2020, 2025, NULL, 'DIRECTO', NULL),
  (4, 'Toyota', 'Corolla', 2020, 2025, NULL, 'DIRECTO', NULL),
  (1, 'Nissan', 'Versa', 2020, 2026, NULL, 'DIRECTO', 'Ajuste original de fabrica'),
  (3, 'Nissan', 'Versa', 2020, 2026, NULL, 'DIRECTO', NULL),
  (4, 'Nissan', 'Versa', 2020, 2026, NULL, 'DIRECTO', NULL),
  (5, 'Nissan', 'Versa', 2020, 2026, NULL, 'DIRECTO', NULL);

INSERT INTO pedido (usuario_id, vehiculo_id, fecha, total, status) VALUES
  (1, 1, '2026-06-20', 798.00, 'ENTREGADO');

INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario, importe) VALUES
  (1, 1, 1, 649.00, 649.00),
  (1, 4, 1, 149.00, 149.00);

INSERT INTO mantenimiento (vehiculo_id, producto_id, pedido_id, fecha, kilometraje, descripcion) VALUES
  (1, 4, 1, '2026-03-10', 78000, 'Cambio de aceite y filtro'),
  (1, 1, 1, '2026-06-22', 81000, 'Cambio de balatas delanteras'),
  (2, 11, NULL, '2025-11-15', 138000, 'Cambio de banda de distribucion');
