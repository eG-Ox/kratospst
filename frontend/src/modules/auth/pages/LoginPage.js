import React from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import '../styles/LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  const handleLoginSuccess = (usuarioData) => {
    onLoginSuccess(usuarioData);
    navigate('/dashboard');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <img src="/static/img/KRATOS_LOGO.png" alt="Kratos" className="login-logo" />
        </div>
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
};

export default LoginPage;
