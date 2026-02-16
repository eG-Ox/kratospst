import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario');
    if (usuarioGuardado && usuarioGuardado !== 'undefined') {
      try {
        const usuarioParsed = JSON.parse(usuarioGuardado);
        setIsAuthenticated(true);
        setUsuario(usuarioParsed);
      } catch (error) {
        localStorage.removeItem('usuario');
      }
    }
    setLoading(false);
  }, []);

  const login = (usuarioData) => {
    setIsAuthenticated(true);
    setUsuario(usuarioData);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsuario(null);
    localStorage.removeItem('usuario');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, usuario, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
