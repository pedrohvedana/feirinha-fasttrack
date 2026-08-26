import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const PIN_BALCONISTA = '1234';

export function AuthProvider({ children }) {
  const [autenticado, setAutenticado] = useState(() => {
    return localStorage.getItem('feirinha_auth') === 'true';
  });

  function login(pin) {
    if (pin === PIN_BALCONISTA) {
      localStorage.setItem('feirinha_auth', 'true');
      setAutenticado(true);
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem('feirinha_auth');
    setAutenticado(false);
  }

  return (
    <AuthContext.Provider value={{ autenticado, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
