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

CREATE TABLE compatibilidad (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES producto(id),
  vehiculo_id INTEGER NOT NULL REFERENCES vehiculo(id),
  tipo TEXT NOT NULL DEFAULT 'DIRECTO',
  nota TEXT,
  UNIQUE(producto_id, vehiculo_id)
);

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
  ('Administracion EnCaja', 'admin@encaja.mx', '$2b$10$lh53eU/s1eC3KuE02cy/hOzHahHAiXlFDba8vYu5VM1OVBMLxaIy2', 'ADMIN');

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
  (1, 'El azul', 'Nissan', 'Versa', 2018, '1.6L HR16DE', 'GASOLINA', 82000),
  (1, 'El de trabajo', 'Volkswagen', 'Jetta', 2016, '2.0L', 'GASOLINA', 143000),
  (2, NULL, 'Chevrolet', 'Aveo', 2019, '1.5L', 'GASOLINA', 60000),
  (2, 'El nuevo', 'Toyota', 'Corolla', 2022, '1.8L Hybrid', 'HIBRIDO', 21000),
  (3, NULL, 'Nissan', 'Versa', 2021, '1.6L HR16DE', 'GASOLINA', 34000);

INSERT INTO compatibilidad (producto_id, vehiculo_id, tipo, nota) VALUES
  (1, 1, 'DIRECTO', 'Ajuste original de fabrica'),
  (3, 1, 'EQUIVALENCIA', 'Equivale al disco original, verificar espesor minimo'),
  (4, 1, 'DIRECTO', NULL),
  (5, 1, 'DIRECTO', NULL),
  (7, 1, 'DIRECTO', 'Se requieren dos piezas'),
  (10, 1, 'DIRECTO', 'Se requieren cuatro piezas'),
  (14, 1, 'DIRECTO', NULL),
  (16, 1, 'DIRECTO', NULL),
  (2, 2, 'DIRECTO', NULL),
  (4, 2, 'DIRECTO', NULL),
  (5, 2, 'DIRECTO', NULL),
  (8, 2, 'DIRECTO', NULL),
  (11, 2, 'DIRECTO', 'Cambio recomendado cada 80,000 km'),
  (12, 2, 'DIRECTO', NULL),
  (1, 3, 'EQUIVALENCIA', 'Misma medida, cambia el sensor de desgaste'),
  (4, 3, 'DIRECTO', NULL),
  (5, 3, 'DIRECTO', NULL),
  (9, 3, 'DIRECTO', NULL),
  (10, 3, 'EQUIVALENCIA', 'Compatible con la misma rosca'),
  (6, 4, 'DIRECTO', NULL),
  (12, 4, 'DIRECTO', NULL),
  (13, 4, 'DIRECTO', NULL),
  (4, 4, 'DIRECTO', NULL),
  (1, 5, 'DIRECTO', 'Ajuste original de fabrica'),
  (3, 5, 'DIRECTO', NULL),
  (4, 5, 'DIRECTO', NULL),
  (5, 5, 'DIRECTO', NULL);

INSERT INTO pedido (usuario_id, vehiculo_id, fecha, total, status) VALUES
  (1, 1, '2026-06-20', 798.00, 'ENTREGADO');

INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario, importe) VALUES
  (1, 1, 1, 649.00, 649.00),
  (1, 4, 1, 149.00, 149.00);

INSERT INTO mantenimiento (vehiculo_id, producto_id, pedido_id, fecha, kilometraje, descripcion) VALUES
  (1, 4, 1, '2026-03-10', 78000, 'Cambio de aceite y filtro'),
  (1, 1, 1, '2026-06-22', 81000, 'Cambio de balatas delanteras'),
  (2, 11, NULL, '2025-11-15', 138000, 'Cambio de banda de distribucion');
