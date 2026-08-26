import { useState } from 'react';
import { useAuth } from '../auth';

export default function Login() {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState(false);
  const { login } = useAuth();

  function handleSubmit(e) {
    e.preventDefault();
    if (login(pin)) {
      window.location.href = '/fila';
    } else {
      setErro(true);
      setPin('');
      setTimeout(() => setErro(false), 2000);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900">Feirinha Fast Track</h1>
          <p className="text-gray-500 text-sm">Acesso balconista</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm text-center">
              PIN incorreto
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
