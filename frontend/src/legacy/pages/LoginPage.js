import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin');
  const [contraseña, setContraseña] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [registroData, setRegistroData] = useState({
    nombre: '',
    email: '',
    contraseña: '',
    confirmarContraseña: ''
  });

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !contraseña) {
      setError('Email y contraseña requeridos');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.login(email, contraseña);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('usuario', JSON.stringify(response.data.usuario));
      onLoginSuccess(response.data.usuario);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setError('');

    if (!registroData.nombre || !registroData.email || !registroData.contraseña) {
      setError('Todos los campos son requeridos');
      return;
    }

    if (registroData.contraseña !== registroData.confirmarContraseña) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.registro(
        registroData.nombre,
        registroData.email,
        registroData.contraseña
      );
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('usuario', JSON.stringify(response.data.usuario));
      onLoginSuccess(response.data.usuario);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistroChange = (e) => {
    const { name, value } = e.target;
    setRegistroData({ ...registroData, [name]: value });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Sistema de Inventario</h1>
          <p>Gestión de Máquinas y Productos</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!mostrarRegistro ? (
          <form onSubmit={handleLogin} className="login-form">
            <h2>Iniciar Sesión</h2>

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
              <label htmlFor="contraseña">Contraseña</label>
              <input
                type="password"
                id="contraseña"
                value={contraseña}
                onChange={(e) => setContraseña(e.target.value)}
                placeholder="Contraseña"
                required
              />
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>

            <p className="toggle-form">
              ¿No tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setMostrarRegistro(true)}
                className="link-button"
              >
                Registrarse
              </button>
            </p>

            <div className="default-credentials">
              <p>Credenciales de prueba:</p>
              <code>admin / admin123</code>
            </div>
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
              <label htmlFor="registroContraseña">Contraseña</label>
              <input
                type="password"
                id="registroContraseña"
                name="contraseña"
                value={registroData.contraseña}
                onChange={handleRegistroChange}
                placeholder="Contraseña"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmarContraseña">Confirmar Contraseña</label>
              <input
                type="password"
                id="confirmarContraseña"
                name="confirmarContraseña"
                value={registroData.confirmarContraseña}
                onChange={handleRegistroChange}
                placeholder="Confirmar contraseña"
                required
              />
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>

            <p className="toggle-form">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setMostrarRegistro(false)}
                className="link-button"
              >
                Iniciar Sesión
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
