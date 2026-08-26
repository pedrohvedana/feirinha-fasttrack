import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import PedidoForm from './pages/PedidoForm';
import FilaPedidos from './pages/FilaPedidos';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

function RotaProtegida({ children }) {
  const { autenticado } = useAuth();
  return autenticado ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<PedidoForm />} />
            <Route path="/login" element={<Login />} />
            <Route path="/fila" element={<RotaProtegida><FilaPedidos /></RotaProtegida>} />
            <Route path="/dashboard" element={<RotaProtegida><Dashboard /></RotaProtegida>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
