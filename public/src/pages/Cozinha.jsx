import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

const STATUS_COLORS = {
  aguardando_pagamento: 'bg-yellow-100 text-yellow-800',
  pago: 'bg-blue-100 text-blue-800',
  em_preparo: 'bg-orange-100 text-orange-800',
  pronto: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  aguardando_pagamento: 'Aguardando',
  pago: 'Pago',
  em_preparo: 'Preparando',
  pronto: 'Pronto!',
  cancelado: 'Cancelado',
};

const TEMPO_CORES = {
  normal: 'bg-emerald-900 text-emerald-100',
  atencao: 'bg-yellow-900 text-yellow-100',
  urgente: 'bg-red-900 text-red-100',
};

export default function Cozinha() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState('todos');
  const logout = useAuth();

  function calcularTempoDecorrido(atualizadoEm) {
    const agora = new Date();
    const atualizado = new Date(atualizadoEm);
    const diffMs = agora - atualizado;
    const minutos = Math.floor(diffMs / 60000);
    const segundos = Math.floor((diffMs % 60000) / 1000);
    return { minutos, segundos, totalSegundos: Math.floor(diffMs / 1000) };
  }

  function getTempoClasse(totalSegundos) {
    if (totalSegundos < 600) return 'normal';
    if (totalSegundos < 1200) return 'atencao';
    return 'urgente';
  }

  function formatarTempo(minutos, segundos) {
    if (minutos > 0) return `${minutos}m ${segundos}s`;
    return `${segundos}s`;
  }

  async function carregar() {
    try {
      const data = await api.filaAtivas();
      const ativos = (data.results || []).filter((p) =>
        ['pago', 'em_preparo', 'pronto'].includes(p.status)
      );
      setPedidos(ativos);
    } catch {
      /* silenciar */
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 5000);
    return () => clearInterval(t);
  }, []);

  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function avancarStatus(id, statusAtual) {
    const proximo = { pago: 'em_preparo', em_preparo: 'pronto' }[statusAtual];
    if (!proximo) return;
    try {
      await api.atualizarStatus(id, proximo);
      carregar();
    } catch {
      /* silenciar */
    }
  }

  const pedidosFiltrados =
    filtro === 'todos'
      ? pedidos
      : pedidos.filter((p) => p.status === filtro);

  return (
    <div className="min-h-screen bg-gray-950 p-4 pb-24">
      <header className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link to="/fila" className="text-sm text-emerald-400 hover:underline">← Fila</Link>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:underline">Dashboard</Link>
          <button onClick={logout} className="text-sm text-red-400 hover:underline ml-auto">Sair</button>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">🍕 Modo Cozinha</h1>
        <p className="text-gray-400">Pedidos ativos — atualiza a cada 5s</p>

        <div className="flex gap-2 mt-4 flex-wrap">
          {['todos', 'pago', 'em_preparo', 'pronto'].map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filtro === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {f === 'todos' ? 'Todos' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </header>

      {carregando && (
        <div className="text-center text-gray-500 py-12 text-xl">Carregando...</div>
      )}

      {pedidosFiltrados.length === 0 && !carregando && (
        <div className="text-center py-12">
          <div className="text-6xl mb-3">🍕</div>
          <p className="text-gray-500 text-xl">Nenhum pedido em preparo</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pedidosFiltrados.map((p) => {
          let itens = [];
          try {
            const raw = typeof p.itens_json === 'string' ? p.itens_json : JSON.stringify(p.itens_json);
            itens = JSON.parse(raw);
          } catch {
            itens = [];
          }

          const tempo = p.atualizado_em ? calcularTempoDecorrido(p.atualizado_em) : { minutos: 0, segundos: 0, totalSegundos: 0 };
          const tempoClasse = getTempoClasse(tempo.totalSegundos);

          return (
            <div
              key={p.id}
              className="bg-gray-900 rounded-2xl border border-gray-700 p-6 shadow-lg hover:border-gray-600 transition"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${STATUS_COLORS[p.status] || 'bg-gray-700 text-gray-300'}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                    <span className="text-lg font-mono text-gray-400">#{p.id}</span>
                    {p.cliente_nome && <span className="text-lg text-gray-200">{p.cliente_nome}</span>}
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl font-mono text-lg font-bold ${TEMPO_CORES[tempoClasse]}`}>
                  {formatarTempo(tempo.minutos, tempo.segundos)}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {itens.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-gray-100 text-lg">
                    <span className="font-medium">{item.quantidade}x {item.nome}</span>
                    <span className="text-emerald-300">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span>Total: <span className="font-bold text-white">R$ {Number(p.valor_total).toFixed(2)}</span></span>
                <span>•</span>
                <span className="capitalize text-gray-400">{p.pagamento_tipo}</span>
              </div>

              <button
                onClick={() => avancarStatus(p.id, p.status)}
                disabled={!['pago', 'em_preparo'].includes(p.status)}
                className={`w-full py-3 rounded-xl font-bold text-lg transition ${
                  ['pago', 'em_preparo'].includes(p.status)
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {p.status === 'pago' && 'Iniciar Preparo'}
                {p.status === 'em_preparo' && 'Marcar Pronto'}
                {p.status === 'pronto' && 'Entregue ✓'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}