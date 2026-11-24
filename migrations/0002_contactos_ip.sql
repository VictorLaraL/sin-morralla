-- Límite de envíos del formulario de contacto: huella con sal de la IP (nunca la IP en claro).
ALTER TABLE contactos ADD COLUMN ip_hash TEXT;
CREATE INDEX contactos_por_ip ON contactos (ip_hash, creado_en);
