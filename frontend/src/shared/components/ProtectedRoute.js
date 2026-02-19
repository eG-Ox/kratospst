import React from 'react';
import { Navigate } from 'react-router-dom';

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [value];
};

const ProtectedRoute = ({
  isAuthenticated,
  authChecked,
  usuario,
  userPermissions,
  requiredPermissions,
  allowedRoles,
  forbiddenRedirect = '/dashboard',
  children
}) => {
  const permisosRequeridos = toArray(requiredPermissions);
  const rolesPermitidos = toArray(allowedRoles);
  const permisosSet =
    userPermissions instanceof Set
      ? userPermissions
      : new Set(Array.isArray(userPermissions) ? userPermissions : []);

  if (!authChecked) {
    return null;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (rolesPermitidos.length && !rolesPermitidos.includes(usuario?.rol)) {
    return <Navigate to={forbiddenRedirect} replace />;
  }
  if (permisosRequeridos.length && !permisosRequeridos.some((permiso) => permisosSet.has(permiso))) {
    return <Navigate to={forbiddenRedirect} replace />;
  }
  return children;
};

export default ProtectedRoute;
