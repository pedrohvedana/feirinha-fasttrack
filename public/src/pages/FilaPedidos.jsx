import { useState, useEffect } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  aguardando_pagamento: 'bg-yellow-100 text-yellow-800',
  pago: 'bg-blue-100 text-blue-800',
  em_preparo: 'bg-orange-100 text-orange-800',
  pronto: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  aguardando_pagamento: 'Aguardando Pagamento',
  pago: 'Pago',
  em_preparo: 'Em Preparo',
  pronto: 'Pronto!',
  cancelado: 'Cancelado',
};

export default function FilaPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      const data = await api.filaAtivas();
      setPedidos(data);
    } catch { /* silenciar */ } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); const t = setInterval(carregar, 5000); return () => clearInterval(t); }, []);

  async function avancarStatus(id, statusAtual) {
    const proximo = { pago: 'em_preparo', em_preparo: 'pronto' }[statusAtual];
    if (!proximo) return;
    try {
      await api.atualizarStatus(id, proximo);
      carregar();
    } catch { /* silenciar */ }
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <header className="max-w-2xl mx-auto mb-6">
        <Link to="/" className="text-sm text-emerald-600 hover:underline">← Novo Pedido</Link>
        <Link to="/dashboard" className="text-sm text-gray-400 hover:underline ml-4">Dashboard</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Fila de Pedidos</h1>
        <p className="text-gray-500 text-sm">Atualiza automaticamente a cada 5 segundos</p>
      </header>

      {carregando ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-500">Nenhum pedido na fila!</p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-3">
          {pedidos.map((p) => {
            let itens = [];
            try { itens = typeof p.itens_json === 'string' ? JSON.parse(p.itens_json) : p.itens_json; } catch { /* ignorar */ }
            const statusColor = STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600';
            const podeAvancar = ['pago', 'em_preparo'].includes(p.status);
            return (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-mono text-xs text-gray-400">#{p.id}</span>
                    <h3 className="font-semibold text-gray-900">{p.cliente_nome}</h3>
                    <p className="text-xs text-gray-400">{p.whatsapp}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {itens.map((i, idx) => (
                    <span key={idx}>{i.quantidade}x {i.nome}{idx < itens.length - 1 ? ', ' : ''}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-600">R$ {Number(p.valor_total).toFixed(2)}</span>
                  {podeAvancar && (
                    <button
                      onClick={() => avancarStatus(p.id, p.status)}
                      className="text-sm bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition"
                    >
                      {p.status === 'pago' ? 'Iniciar Preparo' : 'Marcar Pronto'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
