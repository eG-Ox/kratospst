import React, { useCallback, useEffect, useState } from 'react';
import { backupsService } from '../../../core/services/apiServices';
import useMountedRef from '../../../shared/hooks/useMountedRef';
import '../styles/BackupsPage.css';

const BackupsPage = () => {
  const mountedRef = useMountedRef();
  const [backups, setBackups] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [cargandoLista, setCargandoLista] = useState(true);

  const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');
  const esAdmin = usuarioActual?.rol === 'admin';

  const cargarBackups = useCallback(async () => {
    try {
      setCargandoLista(true);
      const resp = await backupsService.listar();
      if (!mountedRef.current) return;
      setBackups(resp.data || []);
    } catch (err) {
      console.error('Error cargando backups:', err);
      if (mountedRef.current) {
        setStatus('No se pudieron cargar los backups.');
      }
    } finally {
      if (mountedRef.current) {
        setCargandoLista(false);
      }
    }
  }, [mountedRef]);

  useEffect(() => {
    if (esAdmin) {
      cargarBackups();
    }
  }, [cargarBackups, esAdmin]);

  const ejecutarBackupManual = async () => {
    setStatus('');
    setLoading(true);
    try {
      await backupsService.manual();
      if (mountedRef.current) {
        setStatus('Backup creado correctamente.');
      }
      await cargarBackups();
    } catch (err) {
      console.error('Error creando backup:', err);
      if (mountedRef.current) {
        setStatus(err.response?.data?.error || 'Error al crear backup.');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  if (!esAdmin) {
    return (
      <div className="backups-container">
        <div className="backups-card">
          <h1>Backups</h1>
          <p>No tienes permisos para ver esta seccion.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="backups-container">
      <div className="backups-header">
        <h1>Backups</h1>
        <p>Automatico: L-V 5:00 pm, Sabado 12:00 pm.</p>
      </div>

      <div className="backups-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={ejecutarBackupManual}
          disabled={loading}
        >
          {loading ? 'Generando backup...' : 'Backup manual'}
        </button>
        {status && <div className="helper-text">{status}</div>}
      </div>

      <div className="backups-card">
        <h2>Ultimos backups</h2>
        {cargandoLista ? (
          <div className="loading">Cargando...</div>
        ) : backups.length === 0 ? (
          <div className="empty-message">No hay backups.</div>
        ) : (
          <div className="backups-list">
            {backups.map((item) => (
              <div key={item.archivo} className="backup-item">
                {item.archivo}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupsPage;
