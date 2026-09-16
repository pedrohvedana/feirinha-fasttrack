export function fmtPreco(valor) {
  if (valor == null || valor === '') return 'R$ 0,00';
  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : Number(valor);
  if (isNaN(num)) return 'R$ 0,00';
  return 'R$ ' + num.toFixed(2).replace('.', ',');
}

export function fmtDataHora(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

export function fmtData(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch { return ''; }
}

export function fmtTempo(iso, agora) {
  if (!iso) return '';
  try {
    const criado = new Date(iso).getTime();
    const diffMs = agora - criado;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}m`;
    const horas = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${horas}h${mins > 0 ? `${mins}m` : ''}`;
  } catch { return ''; }
}
