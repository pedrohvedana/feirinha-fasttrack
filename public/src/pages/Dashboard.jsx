import { useState, useEffect } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, entregues: 0, em_andamento: 0, receita_total: 0 });
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    try {
      const data = await api.statsHoje();
      setStats(data);
    } catch { /* silenciar */ } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); const t = setInterval(carregar, 10000); return () => clearInterval(t); }, []);

  const metricas = [
    { label: 'Pedidos Hoje', valor: stats.total, cor: 'text-gray-900' },
    { label: 'Em Andamento', valor: stats.em_andamento, cor: 'text-orange-600' },
    { label: 'Entregues', valor: stats.entregues, cor: 'text-emerald-600' },
    { label: 'Receita Total', valor: `R$ ${Number(stats.receita_total).toFixed(2)}`, cor: 'text-emerald-600' },
  ];

  return (
    <div className="min-h-screen p-4">
      <header className="max-w-2xl mx-auto mb-6">
        <Link to="/" className="text-sm text-emerald-600 hover:underline">← Novo Pedido</Link>
        <Link to="/fila" className="text-sm text-gray-400 hover:underline ml-4">Fila</Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Dashboard</h1>
      </header>

      {carregando ? (
        <div className="text-center text-gray-400 py-12">Carregando...</div>
      ) : (
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-4">
          {metricas.map((m) => (
            <div key={m.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-500 mb-1">{m.label}</p>
              <p className={`text-3xl font-bold ${m.cor}`}>{m.valor}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
