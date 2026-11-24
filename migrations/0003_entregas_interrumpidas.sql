-- Entregas interrumpidas: el módulo se reinició a media entrega (corte de luz) y no repite los pulsos.
-- El pago queda por atender para que el dueño confirme con el cliente si recibió todo.
ALTER TABLE creditos ADD COLUMN interrumpido INTEGER NOT NULL DEFAULT 0;
