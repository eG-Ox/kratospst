import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../core/services/apiServices';
import './LoginForm.css';

const LoginForm = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !contrasena) {
      setError('Usuario y contrasena requeridos');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.login(email, contrasena);
      localStorage.setItem('usuario', JSON.stringify(response.data.usuario));
      onLoginSuccess(response.data.usuario);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.error || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form-container">
      <form onSubmit={handleLogin} className="login-form" autoComplete="off">
        <h2>Iniciar Sesion</h2>

        {error && <div className="error-message">{error}</div>}

        <input type="text" name="fakeuser" autoComplete="username" style={{ display: 'none' }} />
        <input
          type="password"
          name="fakepass"
          autoComplete="new-password"
          style={{ display: 'none' }}
        />

        <div className="form-group">
          <label htmlFor="email">Usuario o Email</label>
          <input
            id="email"
            type="text"
            name="usuario"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario o usuario@ejemplo.com"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="contrasena">Contrasena</label>
          <input
            id="contrasena"
            type="password"
            name="contrasena"
            autoComplete="new-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            placeholder="Ingrese su contrasena"
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Cargando...' : 'Iniciar Sesion'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
