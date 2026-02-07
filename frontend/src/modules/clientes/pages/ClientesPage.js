import React, { useEffect, useState } from 'react';
import { clientesService } from '../../../core/services/apiServices';
import '../styles/ClientesPage.css';

const emptyForm = {
  tipo_cliente: '',
  dni: '',
  ruc: '',
  nombre: '',
  apellido: '',
  razon_social: '',
  direccion: '',
  telefono: '',
  correo: ''
};

const ClientesPage = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [consultando, setConsultando] = useState(false);
  const [consultaMensaje, setConsultaMensaje] = useState('');

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const response = await clientesService.getAll();
      setClientes(response.data);
      setError('');
    } catch (err) {
      console.error('Error cargando clientes:', err);
      setError('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditandoCliente(null);
    setConsultaMensaje('');
  };

  const abrirModal = () => {
    resetForm();
    setMostrarModal(true);
  };

  const handleTipoChange = (value) => {
    setConsultaMensaje('');
    setFormData((prev) => ({
      ...prev,
      tipo_cliente: value,
      dni: value === 'natural' || value === 'ce' ? prev.dni : '',
      nombre: value === 'natural' || value === 'ce' ? prev.nombre : '',
      apellido: value === 'natural' || value === 'ce' ? prev.apellido : '',
      ruc: value === 'juridico' ? prev.ruc : '',
      razon_social: value === 'juridico' ? prev.razon_social : ''
    }));
  };

  const handleConsultar = async () => {
    setConsultaMensaje('');
    setError('');

    if (formData.tipo_cliente === 'natural') {
      if (!/^\d{8}$/.test(formData.dni || '')) {
        setConsultaMensaje('El DNI debe tener 8 digitos.');
        return;
      }
      try {
        setConsultando(true);
        const resp = await clientesService.consultaDni(formData.dni);
        if (resp.data?.success) {
          setFormData((prev) => ({
            ...prev,
            nombre: resp.data.nombre || '',
            apellido: resp.data.apellido || ''
          }));
          setConsultaMensaje('Datos obtenidos.');
        } else {
          setConsultaMensaje(resp.data?.error || 'No se encontraron datos.');
        }
      } catch (err) {
        console.error('Error consultando DNI:', err);
        setConsultaMensaje('Error consultando DNI.');
      } finally {
        setConsultando(false);
      }
      return;
    }

    if (formData.tipo_cliente !== 'juridico') {
      return;
    }
    if (!/^\d{11}$/.test(formData.ruc || '')) {
      setConsultaMensaje('El RUC debe tener 11 digitos.');
      return;
    }
    try {
      setConsultando(true);
      const resp = await clientesService.consultaRuc(formData.ruc);
      if (resp.data?.success) {
        setFormData((prev) => ({
          ...prev,
          razon_social: resp.data.razon_social || '',
          direccion: resp.data.direccion || prev.direccion
        }));
        setConsultaMensaje('Datos obtenidos.');
      } else {
        setConsultaMensaje(resp.data?.error || 'No se encontraron datos.');
      }
    } catch (err) {
      console.error('Error consultando RUC:', err);
      setConsultaMensaje('Error consultando RUC.');
    } finally {
      setConsultando(false);
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editandoCliente) {
        await clientesService.update(editandoCliente.id, formData);
      } else {
        await clientesService.create(formData);
      }
      setMostrarModal(false);
      resetForm();
      await cargarClientes();
    } catch (err) {
      console.error('Error guardando cliente:', err);
      setError(err.response?.data?.error || 'Error al guardar cliente');
    }
  };

  const handleEditar = (cliente) => {
    setEditandoCliente(cliente);
    setFormData({
      tipo_cliente: cliente.tipo_cliente,
      dni: cliente.dni || '',
      ruc: cliente.ruc || '',
      nombre: cliente.nombre || '',
      apellido: cliente.apellido || '',
      razon_social: cliente.razon_social || '',
      direccion: cliente.direccion || '',
      telefono: cliente.telefono || '',
      correo: cliente.correo || ''
    });
    setConsultaMensaje('');
    setMostrarModal(true);
  };

  const handleEliminar = async (id) => {
    if (window.confirm('Deseas eliminar este cliente?')) {
      try {
        await clientesService.delete(id);
        await cargarClientes();
      } catch (err) {
        console.error('Error eliminando cliente:', err);
        setError('Error al eliminar cliente');
      }
    }
  };

  const renderDocumento = (cliente) => {
    if (cliente.tipo_cliente === 'natural') {
      return `DNI: ${cliente.dni || '-'}`;
    }
    if (cliente.tipo_cliente === 'ce') {
      return `CE: ${cliente.dni || '-'}`;
    }
    return `RUC: ${cliente.ruc || '-'}`;
  };

  const renderNombre = (cliente) => {
    if (cliente.tipo_cliente === 'natural' || cliente.tipo_cliente === 'ce') {
      return `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || '-';
    }
    return cliente.razon_social || '-';
  };

  const tipoSeleccionado = !!formData.tipo_cliente;

  return (
    <div className="clientes-container">
      <div className="clientes-header">
        <h1>Clientes</h1>
        <button className="btn-primary" onClick={abrirModal}>
          + Nuevo Cliente
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando clientes...</div>
      ) : (
        <div className="clientes-table-container">
          {clientes.length > 0 ? (
            <table className="clientes-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Documento</th>
                  <th>Nombre / Razon social</th>
                  <th>Direccion</th>
                  <th>Telefono</th>
                  <th>Correo</th>
                  <th className="icon-col" title="Acciones">
                    <span className="icon-label" aria-label="Acciones">...</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>
                      {cliente.tipo_cliente === 'natural'
                        ? 'Natural'
                        : cliente.tipo_cliente === 'ce'
                          ? 'CE'
                          : 'Juridico'}
                    </td>
                    <td>{renderDocumento(cliente)}</td>
                    <td>{renderNombre(cliente)}</td>
                    <td>{cliente.direccion || '-'}</td>
                    <td>{cliente.telefono || '-'}</td>
                    <td>{cliente.correo || '-'}</td>
                    <td className="acciones">
                      <button
                        className="icon-btn icon-btn--edit"
                        onClick={() => handleEditar(cliente)}
                        title="Editar"
                        aria-label="Editar"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M4 17.5V20h2.5L17.9 8.6l-2.5-2.5L4 17.5z" />
                          <path d="M20.7 7.2a1 1 0 0 0 0-1.4l-2.5-2.5a1 1 0 0 0-1.4 0l-1.7 1.7 2.5 2.5 1.7-1.7z" />
                        </svg>
                      </button>
                      <button
                        className="icon-btn icon-btn--delete"
                        onClick={() => handleEliminar(cliente.id)}
                        title="Eliminar"
                        aria-label="Eliminar"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6 7h12l-1 14H7L6 7z" />
                          <path d="M9 7V5h6v2h4v2H5V7h4z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-message">No hay clientes registrados</p>
          )}
        </div>
      )}

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editandoCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  resetForm();
                  setMostrarModal(false);
                }}
              >
                X
              </button>
            </div>
            <form onSubmit={handleGuardar}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tipo de cliente *</label>
                  <select
                    value={formData.tipo_cliente}
                    onChange={(e) => handleTipoChange(e.target.value)}
                  >
                    <option value="">Selecciona tipo</option>
                    <option value="natural">Natural (DNI)</option>
                    <option value="juridico">Juridico (RUC)</option>
                    <option value="ce">Carnet de extranjeria (CE)</option>
                  </select>
                </div>

                {!tipoSeleccionado ? (
                  <p className="consulta-mensaje">Selecciona el tipo de cliente para habilitar los campos.</p>
                ) : formData.tipo_cliente === 'natural' || formData.tipo_cliente === 'ce' ? (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>{formData.tipo_cliente === 'ce' ? 'Carnet de extranjeria *' : 'DNI *'}</label>
                        <div className="consulta-row">
                          <input
                            type="text"
                            maxLength={formData.tipo_cliente === 'ce' ? '9' : '8'}
                            value={formData.dni}
                            onChange={(e) =>
                              setFormData({ ...formData, dni: e.target.value.trim() })
                            }
                          />
                          {formData.tipo_cliente === 'natural' && (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={handleConsultar}
                              disabled={consultando}
                            >
                              {consultando ? 'Consultando...' : 'Consultar'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Nombre *</label>
                        <input
                          type="text"
                          value={formData.nombre}
                          onChange={(e) =>
                            setFormData({ ...formData, nombre: e.target.value })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Apellido *</label>
                        <input
                          type="text"
                          value={formData.apellido}
                          onChange={(e) =>
                            setFormData({ ...formData, apellido: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>RUC *</label>
                        <div className="consulta-row">
                          <input
                            type="text"
                            maxLength="11"
                            value={formData.ruc}
                            onChange={(e) =>
                              setFormData({ ...formData, ruc: e.target.value.trim() })
                            }
                          />
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleConsultar}
                            disabled={consultando}
                          >
                            {consultando ? 'Consultando...' : 'Consultar'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Razon social *</label>
                        <input
                          type="text"
                          value={formData.razon_social}
                          onChange={(e) =>
                            setFormData({ ...formData, razon_social: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                {consultaMensaje && <p className="consulta-mensaje">{consultaMensaje}</p>}

                <div className="form-row">
                  <div className="form-group">
                    <label>Direccion</label>
                    <input
                      type="text"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      disabled={!tipoSeleccionado}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Telefono</label>
                    <input
                      type="text"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      disabled={!tipoSeleccionado}
                    />
                  </div>
                  <div className="form-group">
                    <label>Correo</label>
                    <input
                      type="email"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                      disabled={!tipoSeleccionado}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn-success">
                  {editandoCliente ? 'Guardar' : 'Crear'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    resetForm();
                    setMostrarModal(false);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesPage;
