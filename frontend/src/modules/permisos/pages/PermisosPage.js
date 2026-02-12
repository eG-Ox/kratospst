import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { permisosService } from '../../../core/services/apiServices';
import useMountedRef from '../../../shared/hooks/useMountedRef';
import '../styles/PermisosPage.css';

const PermisosPage = () => {
  const mountedRef = useMountedRef();
  const [roles, setRoles] = useState([]);
  const [rolSeleccionado, setRolSeleccionado] = useState('');
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cargarRoles = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await permisosService.listarRoles();
      const rolesData = resp.data || [];
      if (!mountedRef.current) return;
      setRoles(rolesData);
      if (rolesData.length) {
        setRolSeleccionado(rolesData[0].nombre);
      }
      setError('');
    } catch (err) {
      console.error('Error cargando roles:', err);
      if (mountedRef.current) {
        setError('Error al cargar roles');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [mountedRef]);

  const cargarPermisos = useCallback(async (rol) => {
    try {
      setLoading(true);
      const resp = await permisosService.obtenerPorRol(rol);
      if (!mountedRef.current) return;
      setPermisos(resp.data || []);
      setError('');
    } catch (err) {
      console.error('Error cargando permisos:', err);
      if (mountedRef.current) {
        setError('Error al cargar permisos');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [mountedRef]);

  useEffect(() => {
    cargarRoles();
  }, [cargarRoles]);

  useEffect(() => {
    if (rolSeleccionado) {
      cargarPermisos(rolSeleccionado);
    }
  }, [rolSeleccionado, cargarPermisos]);

  const permisosPorGrupo = useMemo(() => {
    const grupos = {};
    permisos.forEach((permiso) => {
      const grupo = permiso.grupo || 'General';
      if (!grupos[grupo]) {
        grupos[grupo] = [];
      }
      grupos[grupo].push(permiso);
    });
    return grupos;
  }, [permisos]);

  const togglePermiso = (clave) => {
    setPermisos((prev) =>
      prev.map((permiso) =>
        permiso.clave === clave
          ? { ...permiso, permitido: !permiso.permitido }
          : permiso
      )
    );
  };

  const guardarPermisos = async () => {
    try {
      setSaving(true);
      await permisosService.actualizarRol(rolSeleccionado, {
        permisos: permisos.map((permiso) => ({
          clave: permiso.clave,
          permitido: !!permiso.permitido
        }))
      });
      if (mountedRef.current) {
        setError('');
      }
    } catch (err) {
      console.error('Error guardando permisos:', err);
      if (mountedRef.current) {
        setError('Error al guardar permisos');
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  return (
    <div className="permisos-container">
      <div className="permisos-header">
        <h1>Permisos por Rol</h1>
        <div className="permisos-actions">
          <select
            value={rolSeleccionado}
            onChange={(e) => setRolSeleccionado(e.target.value)}
          >
            {roles.map((rol) => (
              <option key={rol.id} value={rol.nombre}>
                {rol.nombre}
              </option>
            ))}
          </select>
          <button className="btn-success" onClick={guardarPermisos} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando permisos...</div>
      ) : (
        <div className="permisos-grid">
          {Object.keys(permisosPorGrupo).map((grupo) => (
            <div className="permisos-card" key={grupo}>
              <h3>{grupo}</h3>
              <div className="permisos-list">
                {permisosPorGrupo[grupo].map((permiso) => (
                  <label key={permiso.clave} className="permiso-item">
                    <input
                      type="checkbox"
                      checked={!!permiso.permitido}
                      onChange={() => togglePermiso(permiso.clave)}
                    />
                    <span>{permiso.descripcion || permiso.clave}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PermisosPage;
