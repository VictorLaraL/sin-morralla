-- La demo de la landing cobra $0.01: cualquiera puede probar un cobro real sin pensarlo dos veces.
-- Solo si aún no tiene QR; si ya lo tiene, el precio se cambia desde el portal y se crea un QR nuevo.
UPDATE maquinas SET precio_centavos = 1 WHERE id = 'demo' AND qr_id IS NULL;
