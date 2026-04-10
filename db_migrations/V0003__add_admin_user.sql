
INSERT INTO users (email, password_hash, role, entity_type, full_name, is_verified)
VALUES (
  'geraizmaylov@gmail.com',
  encode(sha256(convert_to('admin123456' || 'auction_salt_2026', 'UTF8')), 'hex'),
  'admin',
  'individual',
  'Администратор',
  true
)
ON CONFLICT (email) DO UPDATE SET role = 'admin', is_verified = true;
