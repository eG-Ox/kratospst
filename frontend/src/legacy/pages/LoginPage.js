import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import '../../styles/LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [registroData, setRegistroData] = useState({
    nombre: '',
    email: '',
    contrasena: '',
    confirmarContrasena: ''
  });

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !contrasena) {
      setError('Email y contrasena requeridos');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.login(email, contrasena);
      localStorage.setItem('usuario', JSON.stringify(response.data.usuario));
      onLoginSuccess(response.data.usuario);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setError('');

    if (!registroData.nombre || !registroData.email || !registroData.contrasena) {
      setError('Todos los campos son requeridos');
      return;
    }

    if (registroData.contrasena !== registroData.confirmarContrasena) {
      setError('Las contrasenas no coinciden');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.registro(
        registroData.nombre,
        registroData.email,
        registroData.contrasena
      );
      localStorage.setItem('usuario', JSON.stringify(response.data.usuario));
      onLoginSuccess(response.data.usuario);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistroChange = (e) => {
    const { name, value } = e.target;
    setRegistroData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Sistema de Inventario</h1>
          <p>Gestion de Maquinas y Productos</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!mostrarRegistro ? (
          <form onSubmit={handleLogin} className="login-form">
            <h2>Iniciar Sesion</h2>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="contrasena">Contrasena</label>
              <input
                type="password"
                id="contrasena"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Contrasena"
                required
              />
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
            </button>

            <p className="toggle-form">
              No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setMostrarRegistro(true)}
                className="link-button"
              >
                Registrarse
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegistro} className="login-form">
            <h2>Crear Cuenta</h2>

            <div className="form-group">
              <label htmlFor="nombre">Nombre</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={registroData.nombre}
                onChange={handleRegistroChange}
                placeholder="Tu nombre"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="registroEmail">Email</label>
              <input
                type="email"
                id="registroEmail"
                name="email"
                value={registroData.email}
                onChange={handleRegistroChange}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="registroContrasena">Contrasena</label>
              <input
                type="password"
                id="registroContrasena"
                name="contrasena"
                value={registroData.contrasena}
                onChange={handleRegistroChange}
                placeholder="Contrasena"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmarContrasena">Confirmar Contrasena</label>
              <input
                type="password"
                id="confirmarContrasena"
                name="confirmarContrasena"
                value={registroData.confirmarContrasena}
                onChange={handleRegistroChange}
                placeholder="Confirmar contrasena"
                required
              />
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>

            <p className="toggle-form">
              Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setMostrarRegistro(false)}
                className="link-button"
              >
                Iniciar Sesion
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
