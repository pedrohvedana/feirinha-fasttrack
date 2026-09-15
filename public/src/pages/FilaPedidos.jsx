import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

const STATUS_COLORS = {
  aguardando_pagamento: 'bg-yellow-100 text-yellow-800',
  pago: 'bg-blue-100 text-blue-800',
  aguardando_retirada: 'bg-violet-100 text-violet-800',
  em_preparo: 'bg-orange-100 text-orange-800',
  pronto: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  aguardando_pagamento: 'Aguardando Pagamento',
  pago: 'Pago',
  aguardando_retirada: 'Cliente Chegou',
  em_preparo: 'Em Preparo',
  pronto: 'Pronto!',
  cancelado: 'Cancelado',
};

export default function FilaPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [somAtivado, setSomAtivado] = useState(false);
  const [modalBalcao, setModalBalcao] = useState(false);
  const [balcaoNome, setBalcaoNome] = useState('');
  const [balcaoItens, setBalcaoItens] = useState({});
  const [cardapio, setCardapio] = useState([]);
  const audioContextRef = useRef(null);
  const idsVistosRef = useRef(new Set());
  const logout = useAuth();

  async function initAudio() {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }

  function tocarBeep() {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  function falar(texto) {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'pt-BR';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    speechSynthesis.speak(utterance);
  }

  async function carregar() {
    try {
      const data = await api.filaAtivas();
      const novosPedidos = data.results || [];

      if (idsVistosRef.current.size > 0) {
        const idsNovos = novosPedidos
          .filter((p) => !idsVistosRef.current.has(p.id))
          .map((p) => p);

        if (idsNovos.length > 0 && somAtivado) {
          await initAudio();
          for (const p of idsNovos) {
            const nome = p.cliente_nome || 'Cliente';
            const primeiroItem = (() => {
              try {
                const itens = JSON.parse(p.itens_json);
                return itens[0] ? `${itens[0].quantidade}x ${itens[0].nome}` : 'pedido';
              } catch {
                return 'pedido';
              }
            })();
            tocarBeep();
            falar(`Novo pedido de ${nome} — ${primeiroItem}`);
          }
        }
      }

      idsVistosRef.current = new Set(novosPedidos.map((p) => p.id));
      setPedidos(novosPedidos);
    } catch {
      /* silenciar */
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    api.cardapio().then((d) => setCardapio(d.results || [])).catch(() => {});
    const t = setInterval(carregar, 5000);
    return () => clearInterval(t);
  }, []);

  async function avancarStatus(id, statusAtual) {
    const proximo = { pago: 'em_preparo', aguardando_retirada: 'em_preparo', em_preparo: 'pronto' }[statusAtual];
    if (!proximo) return;
    try {
      await api.atualizarStatus(id, proximo);
      carregar();
    } catch {
      /* silenciar */
    }
  }

  async function criarPedidoBalcao() {
    const nome = balcaoNome.trim();
    if (!nome) return;
    const itensSelecionados = cardapio.filter((i) => (balcaoItens[i.id] || 0) > 0);
    const itens = itensSelecionados.map((i) => ({ id: i.id, nome: i.nome, preco: i.preco, quantidade: balcaoItens[i.id] }));
    if (itens.length === 0) return;
    const valor = itens.reduce((s, i) => s + i.preco * i.quantidade, 0);
    try {
      await api.criarPedido({
        cliente_nome: nome,
        itens_json: itens,
        valor_total: valor,
        pagamento_tipo: 'dinheiro',
        origem: 'balcao',
      });
      setModalBalcao(false);
      setBalcaoNome('');
      setBalcaoItens({});
      carregar();
    } catch {
      /* silenciar */
    }
  }

  async function toggleSom() {
    const novo = !somAtivado;
    setSomAtivado(novo);
    localStorage.setItem('feirinha_som', novo ? '1' : '0');
    if (novo) {
      await initAudio();
    }
  }

  useEffect(() => {
    const salvo = localStorage.getItem('feirinha_som');
    if (salvo === '1') {
      setSomAtivado(true);
    }
  }, []);

  return (
    <div className="min-h-screen p-4 pb-24">
      <header className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Link to="/" className="text-sm text-emerald-600 hover:underline">← Novo Pedido</Link>
          <button onClick={() => setModalBalcao(true)} className="text-sm text-emerald-600 hover:underline">+ Pedido Balcão</button>
          <Link to="/dashboard" className="text-sm text-gray-400 hover:underline">Dashboard</Link>
          <Link to="/cozinha" className="text-sm text-gray-400 hover:underline">Cozinha</Link>
          <button
            onClick={toggleSom}
            className={`text-sm px-3 py-1 rounded-lg transition ${
              somAtivado
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {somAtivado ? '🔊 Som ON' : '🔇 Som OFF'}
          </button>
          <button onClick={logout} className="text-sm text-red-500 hover:underline ml-auto">Sair</button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Fila Pedidos</h1>
        <p className="text-gray-500 text-sm">Atualiza automaticamente a cada 5 segundos</p>
      </header>

      {carregando && (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      )}

      {pedidos.length === 0 && !carregando && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🍕</div>
          <p className="text-gray-500">Nenhum pedido na fila!</p>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-3">
        {pedidos.map((p) => {
          let itens = [];
          try {
            const raw = typeof p.itens_json === 'string' ? p.itens_json : JSON.stringify(p.itens_json);
            itens = JSON.parse(raw);
          } catch {
            itens = [];
          }

          return (
            <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                    <span className="text-sm text-gray-500 font-mono">#{p.id}</span>
                    {p.cliente_nome && <span className="text-sm text-gray-600">{p.cliente_nome}</span>}
                    {p.origem === 'balcao' && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Balcão</span>}
                  </div>

                  <div className="text-sm text-gray-700 space-y-1 mb-2">
                    {itens.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantidade}x {item.nome}</span>
                        <span className="font-medium">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Total: <span className="font-bold text-gray-900">R$ {Number(p.valor_total).toFixed(2)}</span></span>
                    <span>•</span>
                    <span className="capitalize">{p.pagamento_tipo}</span>
                  </div>
                </div>

                <button
                  onClick={() => avancarStatus(p.id, p.status)}
                  disabled={!['pago', 'aguardando_retirada', 'em_preparo'].includes(p.status)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition whitespace-nowrap ${
                    ['pago', 'aguardando_retirada', 'em_preparo'].includes(p.status)
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {p.status === 'pago' && 'Iniciar Preparo'}
                  {p.status === 'aguardando_retirada' && 'Iniciar Preparo'}
                  {p.status === 'em_preparo' && 'Marcar Pronto'}
                  {p.status === 'pronto' && 'Entregue ✓'}
                  {p.status === 'aguardando_pagamento' && 'Aguardando Pagamento'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalBalcao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setModalBalcao(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Novo Pedido Balcão</h2>

            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do cliente</label>
            <input
              value={balcaoNome}
              onChange={(e) => setBalcaoNome(e.target.value)}
              placeholder="Ex: Maria"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <p className="text-sm font-medium text-gray-700 mb-2">Itens</p>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {cardapio.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{item.nome} — R$ {Number(item.preco).toFixed(2)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBalcaoItens((prev) => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}
                      className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 font-bold"
                    >−</button>
                    <span className="w-6 text-center font-medium">{balcaoItens[item.id] || 0}</span>
                    <button
                      onClick={() => setBalcaoItens((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))}
                      className="w-7 h-7 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModalBalcao(false)} className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={criarPedidoBalcao}
                disabled={!balcaoNome.trim()}
                className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                Criar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}