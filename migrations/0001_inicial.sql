-- Sin Morralla: esquema inicial (un solo cliente).

-- Máquinas. "demo" es la máquina virtual de la landing (sin hardware).
CREATE TABLE maquinas (
  id                   TEXT PRIMARY KEY,
  nombre               TEXT NOT NULL,
  ubicacion            TEXT,
  virtual              INTEGER NOT NULL DEFAULT 0,      -- 1 = sin hardware (demo)
  precio_centavos      INTEGER NOT NULL DEFAULT 0,      -- monto del QR; 0 = el cliente escribe el monto
  valor_pulso_centavos INTEGER NOT NULL DEFAULT 100,    -- cuánto vale un pulso del monedero
  pulso_ms             INTEGER NOT NULL DEFAULT 50,
  pausa_ms             INTEGER NOT NULL DEFAULT 50,
  max_pulsos           INTEGER NOT NULL DEFAULT 50,
  requiere_boton       INTEGER NOT NULL DEFAULT 0,      -- 1 = esperar "Servir con CoDi" antes de los pulsos
  token_hash           TEXT UNIQUE,                     -- SHA-256 del token del ESP32
  qr_id                TEXT UNIQUE,                     -- IDC del QR fijo de la máquina
  qr_string            TEXT,
  qr_monto_centavos    INTEGER,
  ultima_conexion      TEXT,
  creado_en            TEXT NOT NULL
);

-- Cada pago CoDi confirmado por pey. La llave es el transactionId: un pago se registra una sola vez.
CREATE TABLE pagos (
  transaction_id TEXT PRIMARY KEY,
  webhook_id     TEXT NOT NULL,
  tipo           TEXT NOT NULL,                 -- qr | pn
  maquina_id     TEXT,                          -- NULL si el QR no es de ninguna máquina
  codi_qr_id     TEXT,
  monto_centavos INTEGER NOT NULL,
  concepto       TEXT,
  clave_rastreo  TEXT,
  fecha_pago     TEXT NOT NULL,
  recibido_en    TEXT NOT NULL
);
CREATE INDEX pagos_por_fecha ON pagos (fecha_pago);

-- Créditos: los pulsos que la máquina debe recibir. Un pago genera a lo más un crédito.
CREATE TABLE creditos (
  id                 TEXT PRIMARY KEY,
  maquina_id         TEXT NOT NULL REFERENCES maquinas (id),
  transaction_id     TEXT UNIQUE,               -- NULL en pulsos de prueba
  monto_centavos     INTEGER NOT NULL,
  pulsos             INTEGER NOT NULL,
  excedente_centavos INTEGER NOT NULL DEFAULT 0,
  origen             TEXT NOT NULL,             -- codi | prueba
  estado             TEXT NOT NULL,             -- pendiente | entregado | vencido | sin-servicio | devuelto
  nota               TEXT,
  creado_en          TEXT NOT NULL,
  entregado_en       TEXT
);
CREATE INDEX creditos_por_estado ON creditos (maquina_id, estado, creado_en);

-- Interesados que dejan sus datos en la landing.
CREATE TABLE contactos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre    TEXT NOT NULL,
  telefono  TEXT,
  correo    TEXT,
  mensaje   TEXT,
  creado_en TEXT NOT NULL
);

INSERT INTO maquinas (id, nombre, ubicacion, virtual, precio_centavos, valor_pulso_centavos, creado_en)
VALUES ('demo', 'Máquina demo', 'sinmorralla.mx', 1, 100, 100, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT INTO maquinas (id, nombre, ubicacion, virtual, precio_centavos, valor_pulso_centavos, creado_en)
VALUES ('agua-01', 'Despachador de agua', 'Por definir', 0, 1300, 100, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
