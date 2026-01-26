import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../core/services/apiServices';
import './LoginForm.css';

const LoginForm = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@inventario.com');
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
      setError(error.response?.data?.error || 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form-container">
      {!mostrarRegistro ? (
        <form onSubmit={handleLogin} className="login-form">
          <h2>Iniciar Sesión</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="contraseña">Contraseña</label>
            <input
              id="contraseña"
              type="password"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              placeholder="Ingrese su contraseña"
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>

          <button
            type="button"
            className="link-button"
            onClick={() => setMostrarRegistro(true)}
          >
            ¿No tienes cuenta? Regístrate
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegistro} className="login-form">
          <h2>Registrarse</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              type="text"
              value={registroData.nombre}
              onChange={(e) => setRegistroData({ ...registroData, nombre: e.target.value })}
              placeholder="Nombre completo"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              value={registroData.email}
              onChange={(e) => setRegistroData({ ...registroData, email: e.target.value })}
              placeholder="usuario@ejemplo.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-contraseña">Contraseña</label>
            <input
              id="reg-contraseña"
              type="password"
              value={registroData.contraseña}
              onChange={(e) => setRegistroData({ ...registroData, contraseña: e.target.value })}
              placeholder="Contraseña"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmar">Confirmar Contraseña</label>
            <input
              id="confirmar"
              type="password"
              value={registroData.confirmarContraseña}
              onChange={(e) => setRegistroData({ ...registroData, confirmarContraseña: e.target.value })}
              placeholder="Confirmar contraseña"
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>

          <button
            type="button"
            className="link-button"
            onClick={() => setMostrarRegistro(false)}
          >
            ¿Ya tienes cuenta? Inicia Sesión
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginForm;
