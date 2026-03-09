import React, { useCallback, useEffect, useState } from 'react';
import { historialService } from '../../../core/services/apiServices';
import useMountedRef from '../../../shared/hooks/useMountedRef';
import '../styles/HistorialPage.css';

const asCleanString = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

const firstNonEmptyValue = (...values) => {
  for (const value of values) {
    const clean = asCleanString(value);
    if (clean !== null) return clean;
  }
  return null;
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeAction = (value) => {
  const text = asCleanString(value);
  return text ? text.toLowerCase() : null;
};
const DOCUMENTO_TOKEN_REGEX = /\b(?:DNI|RUC|GUIA|CAMBIO\s+CODIGO)\s*:\s*[^|]+/gi;
const DOCUMENTO_TOKEN_SINGLE_REGEX = /\b(DNI|RUC|GUIA|CAMBIO\s+CODIGO)\s*:\s*([^|]+)/i;

const safeParseJson = (value) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
};

const normalizeDocumentoLabel = (label) => (
  String(label || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
);

const extractDocumentoFromText = (value) => {
  const text = asCleanString(value);
  if (!text) return null;
  const match = text.match(DOCUMENTO_TOKEN_SINGLE_REGEX);
  if (!match) return null;
  const label = normalizeDocumentoLabel(match[1]);
  const numero = asCleanString(match[2]);
  if (!numero) return null;
  return `${label}: ${numero}`;
};

const extractDocumentoFromMany = (...values) => {
  for (const value of values) {
    const documento = extractDocumentoFromText(value);
    if (documento) return documento;
  }
  return null;
};

const stripDocumentoTokens = (value) => {
  const text = asCleanString(value);
  if (!text) return null;
  let cleaned = String(text).replace(DOCUMENTO_TOKEN_REGEX, ' ');
  cleaned = cleaned
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/\s+/g, ' ')
    .replace(/\|\s*\|/g, '|')
    .replace(/^\s*\|\s*/, '')
    .replace(/\s*\|\s*$/, '')
    .trim();
  return cleaned || null;
};

const normalizeMotivo = (value) => {
  const text = stripDocumentoTokens(value);
  if (!text) return null;
  let cleaned = text
    .replace(/\|/g, ' - ')
    .replace(/\s{2,}/g, ' ')
    .replace(/-\s*-/g, '-')
    .replace(/^[:\-\s]+/, '')
    .replace(/[:\-\s]+$/, '')
    .trim();
  return cleaned || null;
};

const parseTipoMotivoText = (value) => {
  const text = stripDocumentoTokens(value);
  if (!text) return { tipo: null, motivo: null };

  const colonIndex = text.indexOf(':');
  if (colonIndex > 0) {
    return {
      tipo: asCleanString(text.slice(0, colonIndex)),
      motivo: normalizeMotivo(text.slice(colonIndex + 1))
    };
  }

  const dashIndex = text.indexOf('-');
  if (dashIndex > 0) {
    return {
      tipo: asCleanString(text.slice(0, dashIndex)),
      motivo: normalizeMotivo(text.slice(dashIndex + 1))
    };
  }

  return { tipo: null, motivo: normalizeMotivo(text) };
};

const formatTipoMotivoDisplay = (tipo, motivo) => {
  const tipoText = asCleanString(tipo);
  const motivoText = asCleanString(motivo);
  if (tipoText && motivoText) return `${tipoText.toUpperCase()}-${motivoText.toUpperCase()}`;
  if (tipoText) return tipoText.toUpperCase();
  if (motivoText) return motivoText.toUpperCase();
  return null;
};

const resolveCodigoProducto = (item, antes, despues) => (
  firstNonEmptyValue(
    item.mov_codigo_producto,
    despues?.codigo_producto,
    despues?.codigo,
    despues?.producto_codigo,
    antes?.codigo_producto,
    antes?.codigo,
    antes?.producto_codigo
  )
);

const resolveDescripcion = (item, antes, despues) => (
  firstNonEmptyValue(
    item.mov_descripcion_producto,
    despues?.descripcion_producto,
    despues?.descripcion,
    antes?.descripcion_producto,
    antes?.descripcion,
    item.descripcion
  )
);

const resolveDocumentoReferencia = (item, antes, despues) => {
  const referenciaDirecta = firstNonEmptyValue(
    item.mov_documento_referencia,
    despues?.documento_referencia,
    antes?.documento_referencia
  );
  if (referenciaDirecta) {
    return extractDocumentoFromText(referenciaDirecta) || referenciaDirecta;
  }

  const referenciaTipo = firstNonEmptyValue(
    item.mov_documento_referencia_tipo,
    despues?.documento_referencia_tipo,
    antes?.documento_referencia_tipo
  );
  const referenciaValor = firstNonEmptyValue(
    item.mov_documento_referencia_valor,
    despues?.documento_referencia_valor,
    antes?.documento_referencia_valor
  );
  if (referenciaValor) {
    return referenciaTipo ? `${String(referenciaTipo).toUpperCase()}: ${referenciaValor}` : referenciaValor;
  }

  const referenciaDesdeTexto = extractDocumentoFromMany(
    item.mov_tipo_motivo_movimiento,
    item.mov_motivo,
    despues?.tipo_motivo_movimiento,
    despues?.motivo,
    antes?.tipo_motivo_movimiento,
    antes?.motivo
  );
  if (referenciaDesdeTexto) return referenciaDesdeTexto;

  const dni = firstNonEmptyValue(despues?.dni, antes?.dni);
  if (dni) return `DNI: ${dni}`;

  const guia = firstNonEmptyValue(
    despues?.guia,
    despues?.guia_remision,
    antes?.guia,
    antes?.guia_remision
  );
  if (guia) return `GUIA: ${guia}`;

  const ruc = firstNonEmptyValue(despues?.ruc, antes?.ruc);
  if (ruc) return `RUC: ${ruc}`;

  const codigoAntes = firstNonEmptyValue(antes?.codigo_producto, antes?.codigo);
  const codigoDespues = firstNonEmptyValue(despues?.codigo_producto, despues?.codigo);
  if (codigoAntes && codigoDespues && codigoAntes !== codigoDespues) {
    return `CAMBIO CODIGO: ${codigoAntes} -> ${codigoDespues}`;
  }

  return null;
};

const resolveOperacionMadreId = (item, antes, despues) => (
  firstNonEmptyValue(
    item.operacion_madre_id,
    item.mov_movimiento_grupo_id,
    item.mov_movimiento_id,
    item.mov_inventario_id ? `INV-${item.mov_inventario_id}` : null,
    despues?.movimiento_grupo_id,
    despues?.movimiento_id,
    despues?.inventario_id ? `INV-${despues.inventario_id}` : null,
    item.entidad === 'movimientos' ? item.entidad_id : null,
    item.id,
    antes?.movimiento_grupo_id,
    antes?.movimiento_id
  )
);

const resolveOperacionTransaccionId = (item, despues) => (
  firstNonEmptyValue(
    item.operacion_transaccion_id,
    item.mov_movimiento_detalle_id,
    despues?.movimiento_detalle_id,
    item.entidad === 'movimientos' ? item.entidad_id : null,
    item.id
  )
);

const resolveVariacionStock = (item, antes, despues) => {
  const variacionSql = toNumberOrNull(item.mov_variacion_stock);
  if (variacionSql !== null) return variacionSql;

  const variacionDirecta = toNumberOrNull(despues?.variacion_stock);
  if (variacionDirecta !== null) return variacionDirecta;

  const stockAntesSql = toNumberOrNull(item.mov_stock_antes);
  const stockDespuesSql = toNumberOrNull(item.mov_stock_despues);
  if (stockAntesSql !== null && stockDespuesSql !== null) {
    return stockDespuesSql - stockAntesSql;
  }

  const stockAntes = toNumberOrNull(antes?.stock);
  const stockDespues = toNumberOrNull(despues?.stock);
  if (stockAntes !== null && stockDespues !== null) {
    return stockDespues - stockAntes;
  }

  const cantidad = toNumberOrNull(despues?.cantidad);
  if (cantidad !== null) {
    const tipo = normalizeAction(despues?.tipo_movimiento || item.accion);
    if (tipo === 'ingreso') return Math.abs(cantidad);
    if (tipo === 'salida') return -Math.abs(cantidad);
  }

  return null;
};

const resolveCantidad = (item, despues, variacionStock) => {
  const cantidadSql = toNumberOrNull(item.mov_cantidad);
  if (cantidadSql !== null) return Math.abs(cantidadSql);

  const cantidad = toNumberOrNull(despues?.cantidad);
  if (cantidad !== null) return Math.abs(cantidad);
  if (variacionStock === null) return null;
  return Math.abs(variacionStock);
};

const resolveStockTotalActualizado = (item, despues) => {
  const stockSql = toNumberOrNull(item.mov_stock_despues);
  if (stockSql !== null) return stockSql;
  return toNumberOrNull(despues?.stock);
};

const resolveTipoMotivo = (item, despues) => {
  const rawTipoMotivo = firstNonEmptyValue(
    item.mov_tipo_motivo_movimiento,
    despues?.tipo_motivo_movimiento
  );
  const parsedTipoMotivo = parseTipoMotivoText(rawTipoMotivo);
  const tipo = firstNonEmptyValue(
    item.mov_tipo_movimiento,
    despues?.tipo_movimiento,
    parsedTipoMotivo.tipo,
    item.accion
  );
  const motivo = firstNonEmptyValue(
    normalizeMotivo(item.mov_motivo),
    normalizeMotivo(despues?.motivo),
    parsedTipoMotivo.motivo
  );
  const display = formatTipoMotivoDisplay(tipo, motivo);
  if (display) return display;

  return formatTipoMotivoDisplay(normalizeAction(item.accion), normalizeMotivo(item.descripcion));
};

const formatNumberCell = (value) => {
  const numericValue = toNumberOrNull(value);
  if (numericValue === null) return '-';
  if (Number.isInteger(numericValue)) return String(numericValue);
  return numericValue.toFixed(2);
};

const formatSignedNumber = (value) => {
  const numericValue = toNumberOrNull(value);
  if (numericValue === null) return '-';
  if (numericValue > 0) return `+${formatNumberCell(numericValue)}`;
  return formatNumberCell(numericValue);
};

const stockClass = (value) => {
  const numericValue = toNumberOrNull(value);
  if (numericValue === null) return '';
  if (numericValue > 0) return 'stock-positive';
  if (numericValue < 0) return 'stock-negative';
  return '';
};

const normalizeHistorialRows = (payload) => {
  if (Array.isArray(payload)) return payload.filter((row) => row && typeof row === 'object');
  if (Array.isArray(payload?.rows)) return payload.rows.filter((row) => row && typeof row === 'object');
  if (Array.isArray(payload?.items)) return payload.items.filter((row) => row && typeof row === 'object');
  return [];
};

const buildProfessionalView = (item) => {
  const source = item && typeof item === 'object' ? item : {};
  const antes = safeParseJson(source.antes_json) || {};
  const despues = safeParseJson(source.despues_json) || {};
  const stockMovimiento = resolveVariacionStock(source, antes, despues);
  const cantidad = resolveCantidad(source, despues, stockMovimiento);
  const stockTotalActualizado = resolveStockTotalActualizado(source, despues);

  return {
    fechaHora: formatDateTime(source.created_at),
    entidad: source.entidad || '-',
    accion: source.accion || '-',
    usuario: source.usuario_nombre || source.usuario_id || '-',
    codigoProducto: resolveCodigoProducto(source, antes, despues) || '-',
    descripcion: resolveDescripcion(source, antes, despues) || '-',
    tipoMotivo: resolveTipoMotivo(source, despues) || '-',
    documentoReferencia: resolveDocumentoReferencia(source, antes, despues) || '-',
    operacionMadre: resolveOperacionMadreId(source, antes, despues) || '-',
    idTransaccion: resolveOperacionTransaccionId(source, despues) || '-',
    cantidad,
    stockMovimiento,
    stockTotalActualizado
  };
};

const HistorialPage = () => {
  const mountedRef = useMountedRef();
  const [historial, setHistorial] = useState([]);
  const [filtros, setFiltros] = useState({
    entidad: '',
    accion: '',
    usuario_id: '',
    fecha_inicio: '',
    fecha_fin: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportando, setExportando] = useState(false);

  const cargarHistorial = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await historialService.listar(filtros);
      if (!mountedRef.current) return;
      setHistorial(normalizeHistorialRows(resp.data));
      setError('');
    } catch (err) {
      console.error('Error cargando historial:', err);
      if (mountedRef.current) {
        setError('Error al cargar historial');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [filtros, mountedRef]);

  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const handleBuscar = (e) => {
    e.preventDefault();
    cargarHistorial();
  };

  const descargarArchivo = (data, filename) => {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportar = async () => {
    try {
      setExportando(true);
      const resp = await historialService.exportar(filtros);
      descargarArchivo(resp.data, 'historial.xlsx');
    } catch (err) {
      console.error('Error exportando historial:', err);
      if (mountedRef.current) {
        setError('Error al exportar historial');
      }
    } finally {
      if (mountedRef.current) {
        setExportando(false);
      }
    }
  };

  return (
    <div className="historial-container">
      <div className="historial-header">
        <h1>Historial</h1>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleExportar}
          disabled={exportando}
        >
          {exportando ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>

      <form className="historial-filtros" onSubmit={handleBuscar}>
        <div className="form-group">
          <label>Entidad</label>
          <select
            value={filtros.entidad}
            onChange={(e) => setFiltros({ ...filtros, entidad: e.target.value })}
          >
            <option value="">Todas</option>
            <option value="productos">Productos</option>
            <option value="movimientos">Movimientos</option>
            <option value="clientes">Clientes</option>
            <option value="kits">Kits</option>
            <option value="cotizaciones">Cotizaciones</option>
            <option value="usuarios">Usuarios</option>
          </select>
        </div>
        <div className="form-group">
          <label>Accion</label>
          <select
            value={filtros.accion}
            onChange={(e) => setFiltros({ ...filtros, accion: e.target.value })}
          >
            <option value="">Todas</option>
            <option value="crear">Crear</option>
            <option value="editar">Editar</option>
            <option value="eliminar">Eliminar</option>
            <option value="ingreso">Ingreso</option>
            <option value="salida">Salida</option>
            <option value="toggle">Toggle</option>
          </select>
        </div>
        <div className="form-group">
          <label>Usuario ID</label>
          <input
            type="text"
            value={filtros.usuario_id}
            onChange={(e) => setFiltros({ ...filtros, usuario_id: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Desde</label>
          <input
            type="date"
            value={filtros.fecha_inicio}
            onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Hasta</label>
          <input
            type="date"
            value={filtros.fecha_fin}
            onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary">
          Buscar
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Cargando historial...</div>
      ) : (
        <div className="historial-table-container">
          <table className="historial-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Entidad</th>
                <th>Accion</th>
                <th>Usuario</th>
                <th>Codigo prod</th>
                <th>Descripcion</th>
                <th>Tipo motivo movimiento</th>
                <th>DNI/GUIA/RUC/Cambio codigo</th>
                <th>N° operacion madre</th>
                <th>ID transaccion</th>
                <th>Cantidad</th>
                <th>Stock movimiento</th>
                <th>Stock total actualizado</th>
              </tr>
            </thead>
            <tbody>
              {historial.length === 0 && (
                <tr>
                  <td colSpan="13" className="historial-empty">Sin registros</td>
                </tr>
              )}
              {historial.map((item) => {
                const view = buildProfessionalView(item);
                return (
                  <tr key={item.id}>
                    <td>{view.fechaHora}</td>
                    <td>{view.entidad}</td>
                    <td>{view.accion}</td>
                    <td>{view.usuario}</td>
                    <td className="cell-wrap">{view.codigoProducto}</td>
                    <td className="cell-wrap">{view.descripcion}</td>
                    <td className="cell-wrap">{view.tipoMotivo}</td>
                    <td className="cell-wrap">{view.documentoReferencia}</td>
                    <td>{view.operacionMadre}</td>
                    <td>{view.idTransaccion}</td>
                    <td className="cell-numeric">{formatNumberCell(view.cantidad)}</td>
                    <td className={`cell-numeric ${stockClass(view.stockMovimiento)}`}>
                      {formatSignedNumber(view.stockMovimiento)}
                    </td>
                    <td className="cell-numeric">{formatNumberCell(view.stockTotalActualizado)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HistorialPage;


