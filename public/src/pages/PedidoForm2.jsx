import { useState, useEffect } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';

const PAGAMENTO_LABELS = {
  pix: 'PIX',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
};

export default function PedidoForm() {
  const [clienteNome, setClienteNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [itens, setItens] = useState([]);
  const [pagamentoTipo, setPagamentoTipo] = useState('pix');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(null);
  const [erro, setErro] = useState(null);
  const [cardapio, setCardapio] = useState([]);
  const [carregandoCardapio, setCarregandoCardapio] = useState(true);

  useEffect(() => {
    api.cardapio()
      .then((data) => setCardapio(data.results || []))
      .catch(() => setErro('Erro ao carregar cardápio'))
      .finally(() => setCarregandoCardapio(false));
  }, []);

  function adicionarItem(item) {
    const existente = itens.find((i) => i.nome === item.nome);
    if (existente) {
      setItens(itens.map((i) => i.nome === item.nome ? { ...i, quantidade: i.quantidade + 1 } : i));
    } else {
      setItens([...itens, { nome: item.nome, preco: item.preco, quantidade: 1 }]);
    }
  }

  function removerItem(nome) {
    const existente = itens.find((i) => i.nome === nome);
    if (existente && existente.quantidade > 1) {
      setItens(itens.map((i) => i.nome === nome ? { ...i, quantidade: i.quantidade - 1 } : i));
    } else {
      setItens(itens.filter((i) => i.nome !== nome));
    }
  }

  const valorTotal = itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (itens.length === 0) { setErro('Adicione pelo menos um item'); return; }
    setEnviando(true); setErro(null);
    try {
      const pedido = await api.criarPedido({
        cliente_nome: clienteNome || 'Cliente',
        whatsapp: whatsapp.replace(/\D/g, ''),
        itens_json: itens,
        valor_total: valorTotal,
        pagamento_tipo: pagamentoTipo,
      });
      setSucesso(pedido);
      setClienteNome(''); setWhatsapp(''); setItens([]); setPagamentoTipo('pix');
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido Enviado!</h2>
          <p className="text-gray-600 mb-1">Código: <span className="font-mono font-bold">{sucesso.id}</span></p>
          <p className="text-sm text-gray-500 mb-6">
            Assim que o pagamento for confirmado, você receberá uma mensagem no WhatsApp.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/fila" className="block bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition">
              Ver Fila de Pedidos
            </Link>
            <button onClick={() => setSucesso(null)} className="text-gray-500 hover:text-gray-700 transition">
              Fazer outro pedido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <header className="max-w-lg mx-auto mb-6">
        <Link to="/dashboard" className="text-sm text-emerald-600 hover:underline">Dashboard →</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Feirinha Fast Track</h1>
        <p className="text-gray-500">Monte seu pedido e pague pelo PIX</p>
      </header>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{erro}</div>
        )}

        <div className="space-y-4">
          <input
            type="text" placeholder="Seu nome (opcional)"
            value={clienteNome} onChange={(e) => setClienteNome(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="tel" placeholder="WhatsApp (11999887766)"
            value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Cardápio</h2>
          {carregandoCardapio ? (
            <p className="text-gray-400 text-sm">Carregando cardápio...</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {cardapio.map((item) => {
                const noCarrinho = itens.find((i) => i.nome === item.nome);
                return (
                  <button
                    key={item.id} type="button"
                    onClick={() => adicionarItem(item)}
                    className={`p-3 rounded-xl border text-left transition ${
                      noCarrinho
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium text-sm text-gray-900 block">{item.nome}</span>
                    <span className="text-emerald-600 font-bold text-sm">R$ {item.preco.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {itens.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-gray-900">Seu Pedido</h3>
            {itens.map((item) => (
              <div key={item.nome} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => removerItem(item.nome)} className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm font-bold">−</button>
                  <span className="font-medium">{item.quantidade}x {item.nome}</span>
                  <button type="button" onClick={() => adicionarItem(item)} className="w-7 h-7 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center justify-center text-sm font-bold">+</button>
                </div>
                <span className="font-mono">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-emerald-600">R$ {valorTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Pagamento</h3>
          <div className="flex gap-2">
            {Object.entries(PAGAMENTO_LABELS).map(([key, label]) => (
              <button
                key={key} type="button"
                onClick={() => setPagamentoTipo(key)}
                className={`flex-1 py-3 rounded-xl font-semibold transition ${
                  pagamentoTipo === key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit" disabled={enviando || itens.length === 0}
          className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {enviando ? 'Enviando...' : 'Fazer Pedido'}
        </button>
      </form>
    </div>
  );
}
