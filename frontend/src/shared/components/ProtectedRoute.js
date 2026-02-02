import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ isAuthenticated, authChecked, children }) => {
  if (!authChecked) {
    return null;
  }
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
