import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PedidoForm from './pages/PedidoForm';
import FilaPedidos from './pages/FilaPedidos';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<PedidoForm />} />
          <Route path="/fila" element={<FilaPedidos />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
