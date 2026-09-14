ALTER TABLE pedidos ADD COLUMN pix_payment_id INTEGER;
ALTER TABLE pedidos ADD COLUMN pix_qr_code TEXT;
ALTER TABLE pedidos ADD COLUMN pix_qr_base64 TEXT;
ALTER TABLE pedidos ADD COLUMN pix_expira_em DATETIME;