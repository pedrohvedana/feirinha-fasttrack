import { useState, useEffect } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

export default function CardapioAdmin() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [editando, setEditando] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editPreco, setEditPreco] = useState('');
  const { logout } = useAuth();

  async function carregar() {
    try {
      const data = await api.cardapioTodos();
      setItens(data.results || []);
    } catch { /* silenciar */ } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function adicionar(e) {
    e.preventDefault();
    if (!novoNome || !novoPreco) return;
    try {
      await api.cardapioCriar({ nome: novoNome, preco: parseFloat(novoPreco), ordem: itens.length + 1 });
      setNovoNome(''); setNovoPreco('');
      carregar();
    } catch { /* silenciar */ }
  }

  async function salvarEdicao(id) {
    try {
      await api.cardapioAtualizar(id, { nome: editNome, preco: parseFloat(editPreco) });
      setEditando(null);
      carregar();
    } catch { /* silenciar */ }
  }

  async function toggleAtivo(id, ativo) {
    try {
      await api.cardapioAtualizar(id, { ativo: ativo ? 0 : 1 });
      carregar();
    } catch { /* silenciar */ }
  }

  async function excluir(id) {
    if (!confirm('Excluir este item?')) return;
    try {
      await api.cardapioExcluir(id);
      carregar();
    } catch { /* silenciar */ }
  }

  return (
    <div className="min-h-screen p-4">
      <header className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Link to="/" className="text-sm text-emerald-600 hover:underline">← Pedido</Link>
          <Link to="/fila" className="text-sm text-gray-400 hover:underline">Fila</Link>
          <Link to="/dashboard" className="text-sm text-gray-400 hover:underline">Dashboard</Link>
          <button onClick={logout} className="text-sm text-red-500 hover:underline ml-auto">Sair</button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Cardápio</h1>
        <p className="text-gray-500">Gerenciar itens do cardápio</p>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        <form onSubmit={adicionar} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-3">
          <input
            type="text" placeholder="Nome do item"
            value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="number" step="0.50" placeholder="Preço"
            value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)}
            className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition">
            Adicionar
          </button>
        </form>

        {carregando ? (
          <div className="text-center text-gray-400 py-12">Carregando...</div>
        ) : (
          <div className="space-y-2">
            {itens.map((item) => (
              <div key={item.id} className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3 ${item.ativo ? 'border-gray-100' : 'border-red-200 opacity-50'}`}>
                {editando === item.id ? (
                  <>
                    <input
                      type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                      type="number" step="0.50" value={editPreco} onChange={(e) => setEditPreco(e.target.value)}
                      className="w-24 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button onClick={() => salvarEdicao(item.id)} className="text-emerald-600 text-sm font-semibold">Salvar</button>
                    <button onClick={() => setEditando(null)} className="text-gray-400 text-sm">Cancelar</button>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.nome}</p>
                      <p className="text-emerald-600 font-bold text-sm">R$ {item.preco.toFixed(2)}</p>
                    </div>
                    <button onClick={() => { setEditando(item.id); setEditNome(item.nome); setEditPreco(item.preco); }} className="text-gray-400 hover:text-gray-600 text-sm">Editar</button>
                    <button onClick={() => toggleAtivo(item.id, item.ativo)} className={`text-sm ${item.ativo ? 'text-orange-500' : 'text-emerald-500'}`}>
                      {item.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button onClick={() => excluir(item.id)} className="text-red-400 hover:text-red-600 text-sm">Excluir</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
