-- Seed defaults atendimento_config (editável depois via D1 sem redeploy)
INSERT OR IGNORE INTO atendimento_config (chave, valor) VALUES
  ('atendente_numero', '5515997646555'),
  ('atendente_nome', 'Rafael'),
  ('bem_vindo', 'Olá! Bem-vindo(a) à Feirinha Fast Track 🍽️
Escolha uma opção:
1️⃣ Ver cardápio e pedir
2️⃣ Rastrear pedido
3️⃣ Horário e localização
4️⃣ Dúvidas frequentes
5️⃣ Falar com atendente
0️⃣ Cancelar');