import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { fmtPreco } from '../lib/formatters';

const STATUS_CONFIG = {
  aguardando_pagamento: { label: 'Aguardando Pagamento', cor: 'bg-yellow-100 text-yellow-800', icone: '⏳' },
  pago: { label: 'Pago', cor: 'bg-blue-100 text-blue-800', icone: '✅' },
  aguardando_retirada: { label: 'Você chegou — em breve no preparo', cor: 'bg-violet-100 text-violet-800', icone: '📍' },
  em_preparo: { label: 'Em Preparo', cor: 'bg-orange-100 text-orange-800', icone: '🍳' },
  pronto: { label: 'Pronto para Retirada', cor: 'bg-emerald-100 text-emerald-800', icone: '🎉' },
  cancelado: { label: 'Cancelado', cor: 'bg-red-100 text-red-800', icone: '❌' },
  entregue: { label: 'Entregue', cor: 'bg-gray-100 text-gray-800', icone: '✅' },
};

export default function PedidoRastreio() {
  const [pedido, setPedido] = useState(null);
  const [posicao, setPosicao] = useState(null);
  const [tempoEstimado, setTempoEstimado] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [marcando, setMarcando] = useState(false);
  const [chegou, setChegou] = useState(false);

  const { id } = useParams();

  async function marcarChegada() {
    setMarcando(true);
    try {
      await api.marcarChegada(id);
      setChegou(true);
      const data = await api.buscarPedido(id);
      setPedido(data);
    } catch {
      setErro('Não foi possível registrar sua chegada. Tente novamente.');
    } finally {
      setMarcando(false);
    }
  }

  useEffect(() => {
    async function buscar() {
      try {
        const data = await api.buscarPedido(id);
        setPedido(data);

        // Buscar posição na fila
        const filaData = await api.filaAtivas();
        const fila = filaData.results || [];
        const idx = fila.findIndex((p) => p.id === id);
        if (idx >= 0) {
          setPosicao(idx + 1);
          setTempoEstimado((idx + 1) * 7); // ~7 min por pedido na cozinha
        } else {
          setPosicao(null);
        }
      } catch {
        setErro('Pedido não encontrado');
      } finally {
        setCarregando(false);
      }
    }
    buscar();

    const t = setInterval(buscar, 5000);
    return () => clearInterval(t);
  }, [id]);

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">🍕</div>
          <p className="text-gray-500 text-lg">Buscando seu pedido...</p>
        </div>
      </div>
    );
  }

  if (erro || !pedido) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido não encontrado</h1>
          <p className="text-gray-500 mb-6">{erro || 'Código inválido'}</p>
          <Link to="/" className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition">
            Fazer Novo Pedido
          </Link>
        </div>
      </div>
    );
  }

  let itens = [];
  try {
    const raw = typeof pedido.itens_json === 'string' ? pedido.itens_json : JSON.stringify(pedido.itens_json);
    const parsed = JSON.parse(raw);
    itens = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
  } catch {
    itens = [];
  }

  const status = STATUS_CONFIG[pedido.status] || { label: pedido.status, cor: 'bg-gray-100 text-gray-800', icone: '❓' };
  const isFinal = ['pronto', 'entregue', 'cancelado'].includes(pedido.status);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <header className="mb-6">
          <Link to="/" className="text-sm text-emerald-600 hover:underline">← Novo Pedido</Link>
        </header>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className={`px-6 py-4 ${status.cor}`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{status.icone}</span>
              <div>
                <p className="text-sm font-medium">Status do Pedido</p>
                <p className="text-xl font-bold">{status.label}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">Código do Pedido</p>
              <p className="text-3xl font-bold font-mono text-gray-900">#{p.id}
                <p className="text-xl text-gray-900 mt-1">{pedido.cliente_nome || 'Cliente'}</p>
                <p className="text-gray-500 text-sm">{fmtPreco(pedido.valor_total)}</p></p>
            </div>

            {pedido.cliente_nome && (
              <div className="text-center">
                <p className="text-sm text-gray-500">Cliente</p>
                <p className="text-xl font-medium text-gray-900">{pedido.cliente_nome}</p>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Itens</h3>
              <div className="space-y-3">
                {itens.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{item.quantidade}x {item.nome}</p>
                      <p className="text-sm text-gray-600">{fmtPreco(item.preco)}</p>
                    </div>
                    <p className="text-gray-700 font-semibold">{fmtPreco(item.preco * item.quantidade)}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-3 border-t border-gray-100 mt-3">
                <span className="text-lg font-medium text-gray-900">Total</span>
                <span className="text-xl font-bold text-emerald-600">{fmtPreco(pedido.valor_total)}</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-500 mb-1">Pagamento</p>
              <p className="capitalize font-medium text-gray-900">{pedido.pagamento_tipo}</p>
            </div>

            {pedido.status === 'pago' && posicao && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-sm text-gray-500">Sua posição na fila</p>
                <p className="text-3xl font-bold text-blue-700">#{posicao}</p>
                <p className="text-sm text-gray-500 mt-1">⏱️ Estimativa: ~{tempoEstimado} min</p>
                {chegou ? (
                  <p className="text-lg text-violet-600 font-bold mt-2">✅ Você já chegou!</p>
                ) : (
                  <button
                    onClick={marcarChegada}
                    disabled={marcando}
                    className="w-full py-4 bg-violet-600 text-white rounded-xl font-bold text-lg hover:bg-violet-700 transition disabled:opacity-50 mt-3"
                  >
                    {marcando ? 'Registrando...' : '📍 Cheguei na feirinha!'}
                  </button>
                )}
              </div>
            )}

            {pedido.status === 'aguardando_retirada' && (
              <div className="text-center text-sm text-violet-700 bg-violet-50 rounded-xl p-4">
                Chegada registrada! Avisamos o balcão. Agora é só aguardar ficar pronto.
              </div>
            )}

            {isFinal && pedido.status !== 'cancelado' && (
              <div className="text-center text-sm text-emerald-700 bg-emerald-50 rounded-xl p-4">
                Seu pedido está {pedido.status === 'pronto' ? 'pronto para retirada!' : 'entregue. Obrigado! 😊'}
              </div>
            )}

            {pedido.status === 'cancelado' && (
              <div className="text-center text-sm text-red-700 bg-red-50 rounded-xl p-4">
                Este pedido foi cancelado. Faça um novo pedido quando quiser.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Atualizando automaticamente...</p>
          <p className="mt-1">Feirinha Fast Track</p>
        </div>
      </div>
    </div>
  );
}