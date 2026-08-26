const API_BASE = 'https://feirinha-fasttrack-api.pedro-vedana.workers.dev';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Erro na API');
  }
  return res.json();
}

export const api = {
  criarPedido: (dados) => request('/pedidos', { method: 'POST', body: JSON.stringify(dados) }),
  listarPedidos: () => request('/pedidos'),
  buscarPedido: (id) => request(`/pedidos/${id}`),
  atualizarStatus: (id, status) => request(`/pedidos/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  confirmarPagamento: (id) => request(`/pedidos/${id}/confirmar-pagamento`, { method: 'POST' }),
  filaAtivas: () => request('/pedidos/fila/ativas'),
  statsHoje: () => request('/pedidos/stats/hoje'),
  cardapio: () => request('/cardapio'),
  cardapioTodos: () => request('/cardapio/todos'),
  cardapioCriar: (dados) => request('/cardapio', { method: 'POST', body: JSON.stringify(dados) }),
  cardapioAtualizar: (id, dados) => request(`/cardapio/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  cardapioExcluir: (id) => request(`/cardapio/${id}`, { method: 'DELETE' }),
};
