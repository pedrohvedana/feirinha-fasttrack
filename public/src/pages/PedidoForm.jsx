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
    if (itens.length === 0) {
      setErro('Adicione pelo menos um item');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const pedido = await api.criarPedido({
        cliente_nome: clienteNome || 'Cliente',
        whatsapp: whatsapp.replace(/\D/g, ''),
        itens_json: itens,
        valor_total: valorTotal,
        pagamento_tipo: pagamentoTipo,
      });
      setSucesso(pedido);
    } catch (err) {
      setErro(err.message || 'Erro ao criar pedido');
    } finally {
      setEnviando(false);
    }
  }

  function formatarCopiaCola(qrCode) {
    return qrCode;
  }

  if (sucesso) {
    return (
      <div className="min-h-screen p-4 pb-24">
        <header className="max-w-lg mx-auto mb-6">
          <Link to="/dashboard" className="text-sm text-emerald-600 hover:underline">Dashboard →</Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Feirinha Fast Track</h1>
          <p className="text-gray-500">Monte seu pedido pague pelo PIX</p>
        </header>

        <div className="max-w-lg mx-auto space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm text-center">
            ✅ Pedido <strong>#{sucesso.id}</strong> criado com sucesso!
          </div>

          {sucesso.pix && pagamentoTipo === 'pix' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 text-center">Pague com PIX</h3>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <img
                  src={`data:image/png;base64,${sucesso.pix.qr_base64}`}
                  alt="QR Code PIX"
                  className="mx-auto mb-3"
                  width="200"
                  height="200"
                />
                <p className="text-sm text-gray-500 mb-2">Copia e cola:</p>
                <div className="bg-white border border-gray-200 rounded p-2 font-mono text-xs break-all select-all" onClick={(e) => e.target.select()}>
                  {sucesso.pix.qr_code}
                </div>
                <p className="text-xs text-gray-400 mt-2">Toque para selecionar tudo</p>
              </div>
              {sucesso.pix.expira_em && (
                <p className="text-center text-sm text-gray-500">
                  Expira em: {new Date(sucesso.pix.expira_em).toLocaleTimeString('pt-BR')}
                </p>
              )}
            </div>
          )}

          {pagamentoTipo !== 'pix' && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm text-center">
              Pedido criado! Aguarde confirmação de pagamento ({PAGAMENTO_LABELS[pagamentoTipo]}).
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Link to="/fila" className="block bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition text-center">
              Ver Fila Pedidos
            </Link>
            <button onClick={() => setSucesso(null)} className="text-gray-500 hover:text-gray-700 transition text-center">
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
        <p className="text-gray-500">Monte seu pedido pague pelo PIX</p>
      </header>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {erro}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Seu nome (opcional)"
            value={clienteNome}
            onChange={(e) => setClienteNome(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="tel"
            placeholder="WhatsApp (11999887766)"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
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
                    key={item.id}
                    type="button"
                    onClick={() => adicionarItem(item)}
                    className={`p-3 rounded-xl border text-left transition ${noCarrinho ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
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
              <div key={item.nome} className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{item.quantidade}x {item.nome}</span>
                <span className="text-gray-500">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                <button type="button" onClick={() => removerItem(item.nome)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-gray-200 font-bold text-lg">
              <span>Total</span>
              <span className="text-emerald-600">R$ {valorTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Forma de Pagamento</h3>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PAGAMENTO_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPagamentoTipo(key)}
                className={`py-3 rounded-xl font-medium transition ${pagamentoTipo === key ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={enviando || itens.length === 0}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold text-lg hover:bg-emerald-700 disabled:bg-emerald-300 transition"
        >
          {enviando ? 'Enviando...' : `Finalizar Pedido — R$ ${valorTotal.toFixed(2)}`}
        </button>
      </form>
    </div>
  );
}