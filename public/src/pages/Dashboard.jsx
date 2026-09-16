import { useState, useEffect } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

const STATUS_LABELS = {
  aguardando_pagamento: 'Aguardando',
  pago: 'Pago',
  aguardando_retirada: 'Chegou',
  em_preparo: 'Preparando',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const STATUS_CORES = {
  aguardando_pagamento: 'bg-yellow-100 text-yellow-800',
  pago: 'bg-blue-100 text-blue-800',
  aguardando_retirada: 'bg-violet-100 text-violet-800',
  em_preparo: 'bg-orange-100 text-orange-800',
  pronto: 'bg-emerald-100 text-emerald-800',
  entregue: 'bg-gray-100 text-gray-700',
  cancelado: 'bg-red-100 text-red-800',
};

function fmtHora(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function fmtTempo(iso, agora) {
  if (!iso) return '';
  try {
    const criado = new Date(iso).getTime();
    const diffMin = Math.floor((agora - criado) / 60000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `${diffMin}m`;
    const horas = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${horas}h${mins > 0 ? `${mins}m` : ''}`;
  } catch { return ''; }
}

export default function Dashboard() {
  const [dados, setDados] = useState(null);
  const [agora, setAgora] = useState(Date.now());
  const [carregando, setCarregando] = useState(true);
  const { logout } = useAuth();

  async function carregar() {
    try {
      const data = await api.statsDashboard();
      setDados(data);
    } catch { /* silenciar */ } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); const t = setInterval(carregar, 10000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 30000); return () => clearInterval(t); }, []);

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">📊</div>
          <p className="text-gray-500">Carregando painel...</p>
        </div>
      </div>
    );
  }

  const hoje = dados?.hoje || {};
  const semana = dados?.semana || {};
  const fila = dados?.fila || {};
  const top = dados?.topProdutos || [];
  const ultimos = dados?.ultimos || [];
  const longos = dados?.pedidosLongos || 0;

  const totalPagamentos = (hoje.qtd_pix || 0) + (hoje.qtd_dinheiro || 0) + (hoje.qtd_cartao || 0);

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <header className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center gap-4 mb-2 flex-wrap">
          <Link to="/" className="text-sm text-emerald-600 hover:underline">← Novo Pedido</Link>
          <Link to="/fila" className="text-sm text-emerald-600 hover:underline">Fila</Link>
          <Link to="/cozinha" className="text-sm text-gray-500 hover:underline">Cozinha</Link>
          <Link to="/cardapio" className="text-sm text-gray-500 hover:underline">Cardápio</Link>
          <button onClick={logout} className="text-sm text-red-500 hover:underline ml-auto">Sair</button>
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-gray-900">Painel de Controle</h1>
          <span className="text-sm text-gray-500">Atualiza a cada 10s • {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-6">

        {/* Alerta de pedidos parados */}
        {longos > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
            <span className="text-3xl">⚠️</span>
            <div>
              <p className="font-bold text-red-800">{longos} pedido(s) parados há mais de 15 min</p>
              <Link to="/fila" className="text-sm text-red-600 underline">Ver fila agora</Link>
            </div>
          </div>
        )}

        {/* Fila de Operação (em tempo real) */}
        <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white shadow-lg">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            👁️ Operação ao vivo
          </h2>
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="bg-yellow-500/20 rounded-xl p-3">
              <p className="text-3xl font-bold text-yellow-300">{fila.aguardando || 0}</p>
              <p className="text-xs text-yellow-200">Aguardando pgto</p>
            </div>
            <div className="bg-blue-500/20 rounded-xl p-3">
              <p className="text-3xl font-bold text-blue-300">{fila.pago || 0}</p>
              <p className="text-xs text-blue-200">Pagos</p>
            </div>
            <div className="bg-violet-500/20 rounded-xl p-3">
              <p className="text-3xl font-bold text-violet-300">{fila.aguardando_retirada || 0}</p>
              <p className="text-xs text-violet-200">Chegaram</p>
            </div>
            <div className="bg-orange-500/20 rounded-xl p-3">
              <p className="text-3xl font-bold text-orange-300">{fila.em_preparo || 0}</p>
              <p className="text-xs text-orange-200">Preparando</p>
            </div>
            <div className="bg-emerald-500/20 rounded-xl p-3">
              <p className="text-3xl font-bold text-emerald-300">{fila.pronto || 0}</p>
              <p className="text-xs text-emerald-200">Prontos</p>
            </div>
          </div>
        </section>

        {/* Métricas principais */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Pedidos hoje</p>
            <p className="text-3xl font-bold text-gray-900">{hoje.total || 0}</p>
            <p className="text-xs text-gray-400 mt-1">{hoje.cancelados || 0} cancelados</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Receita hoje</p>
            <p className="text-3xl font-bold text-emerald-600">R$ {Number(hoje.receita_total || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">R$ {Number(hoje.receita_em_aberto || 0).toFixed(2)} em aberto</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Ticket médio</p>
            <p className="text-3xl font-bold text-gray-900">R$ {Number(hoje.ticket_medio || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">por pedido entregue</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500 mb-1">Tempo médio preparo</p>
            <p className="text-3xl font-bold text-gray-900">{dados?.tempoMedioMinutos || 0} min</p>
            <p className="text-xs text-gray-400 mt-1">hoje</p>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Pagamentos + semana */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Formas de pagamento hoje</h2>
            {totalPagamentos === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum pedido pago hoje ainda</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'PIX', qtd: hoje.qtd_pix || 0, cor: 'bg-teal-500' },
                  { label: 'Dinheiro', qtd: hoje.qtd_dinheiro || 0, cor: 'bg-emerald-500' },
                  { label: 'Cartão', qtd: hoje.qtd_cartao || 0, cor: 'bg-indigo-500' },
                ].map((p) => {
                  const pct = totalPagamentos > 0 ? Math.round((p.qtd / totalPagamentos) * 100) : 0;
                  return (
                    <div key={p.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{p.label}</span>
                        <span className="text-gray-600">{p.qtd} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div className={`${p.cor} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500">Últimos 7 dias</p>
                <p className="font-bold text-gray-900">R$ {Number(semana.receita_total || 0).toFixed(2)}</p>
                <p className="text-xs text-gray-400">{semana.total || 0} pedidos</p>
              </div>
              <span className="text-2xl">📅</span>
            </div>
          </section>

          {/* Top produtos */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Top produtos hoje</h2>
            {top.length === 0 ? (
              <p className="text-gray-400 text-sm">Sem vendas registradas hoje</p>
            ) : (
              <ol className="space-y-2">
                {top.map((prod, i) => (
                  <li key={prod.nome} className="flex items-center gap-3">
                    <span className="text-lg w-6 text-center font-bold text-gray-400">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{prod.nome}</p>
                      <p className="text-xs text-gray-500">{prod.quantidade} un × R$ {(prod.receita / (prod.quantidade || 1)).toFixed(2)}</p>
                    </div>
                    <span className="font-bold text-emerald-600 text-sm">R$ {prod.receita.toFixed(2)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Últimos pedidos */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Últimos pedidos</h2>
            <Link to="/fila" className="text-sm text-emerald-600 hover:underline">Ver fila completa →</Link>
          </div>
          {ultimos.length === 0 ? (
            <p className="text-gray-400 text-sm">Sem pedidos ainda hoje</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {ultimos.map((p) => (
                <li key={p.id} className="py-2.5 flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CORES[p.status] || 'bg-gray-100 text-gray-700'}`}>
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                  <span className="font-mono text-gray-500 text-sm">#{p.id}</span>
                  <span className="text-sm text-gray-800 truncate flex-1">{p.cliente_nome || '—'}</span>
                  {p.origem === 'balcao' && <span className="text-xs text-gray-400">Balcão</span>}
                  {p.origem === 'prepedido' && <span className="text-xs text-violet-600">WHATSAPP</span>}
                  <span className="text-xs text-gray-400 capitalize">{p.pagamento_tipo}</span>
                  <span className="font-bold text-gray-900 text-sm whitespace-nowrap">R$ {Number(p.valor_total).toFixed(2)}</span>
                  <span className="text-xs text-gray-400">{fmtTempo(p.criado_em, agora)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

      </main>
    </div>
  );
}
