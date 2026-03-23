import React, { useEffect, useRef, useState } from 'react';
import { clientesService } from '../../../core/services/apiServices';
import '../styles/RotulosPage.css';

const AGENCIA_OTROS = 'OTROS';

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const normalizarDocumento = (value) => String(value || '').replace(/\D/g, '').slice(0, 11);

const obtenerTipoDocumento = (value) => {
  const documento = normalizarDocumento(value);
  if (documento.length === 8) return 'dni';
  if (documento.length === 11) return 'ruc';
  return '';
};

const construirNombreConsultado = (tipoDocumento, data) => {
  if (tipoDocumento === 'ruc') {
    return String(data?.razon_social || '').trim();
  }

  return `${data?.nombre || ''} ${data?.apellido || ''}`.trim();
};

const construirHtmlImpresion = ({ documento, tipoDocumento, nombre, ruta }) => `
  <!doctype html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Rotulo</title>
      <style>
        @page { size: A4 landscape; margin: 0; }
        * { box-sizing: border-box; }
        html,
        body {
          width: 297mm;
          height: 210mm;
          margin: 0;
          padding: 0;
          overflow: hidden;
          background: #ffffff;
          font-family: 'IBM Plex Sans', sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        body {
          position: relative;
        }
        .print-btn {
          position: fixed;
          top: 12px;
          right: 12px;
          z-index: 10;
          padding: 10px 16px;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          cursor: pointer;
        }
        .sheet {
          width: 297mm;
          height: 210mm;
          padding: 6mm;
          background: #ffffff;
        }
        .frame {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border: 3px solid #f5b000;
          border-radius: 8mm;
          background: #ffffff;
        }
        .watermark {
          position: absolute;
          inset: 12mm 20mm;
          display: grid;
          place-items: center;
          opacity: 0.08;
          pointer-events: none;
          z-index: 0;
        }
        .watermark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .logo {
          position: absolute;
          top: 8mm;
          left: 10mm;
          width: 52mm;
          z-index: 2;
        }
        .content-box {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          padding: 8mm 10mm;
          overflow: hidden;
        }
        .content {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5.5mm;
          padding: 18mm 4mm 8mm;
          text-align: center;
        }
        .line {
          width: 100%;
          margin: 0;
          overflow-wrap: anywhere;
          word-break: break-word;
          line-height: 0.96;
          text-transform: uppercase;
        }
        .documento {
          color: #0f3f91;
          font-size: 17mm;
          font-weight: 900;
          letter-spacing: 0.05em;
        }
        .nombre {
          color: #0f172a;
          font-size: 28mm;
          font-weight: 900;
        }
        .ruta {
          color: #0f3f91;
          font-size: 18mm;
          font-weight: 900;
          line-height: 1.02;
        }
        @media print {
          .print-btn { display: none; }
        }
      </style>
    </head>
    <body>
      <button class="print-btn" onclick="window.print()">Imprimir</button>
      <div class="sheet">
        <div class="frame">
          <div class="watermark"><img src="/static/img/KRATOS_LOGO.png" alt="" /></div>
          <img src="/static/img/KRATOS_LOGO.png" class="logo" alt="Kratos" />
          <div class="content-box">
            <div class="content" id="rotuloContent">
              <p class="line documento" data-size="17" data-min="7.5">${escapeHtml(
                tipoDocumento.toUpperCase()
              )} ${escapeHtml(documento)}</p>
              <p class="line nombre" data-size="28" data-min="8.5">${escapeHtml(nombre || '-')}</p>
              <p class="line ruta" data-size="18" data-min="7">${escapeHtml(ruta)}</p>
            </div>
          </div>
        </div>
      </div>
      <script>
        (function () {
          const content = document.getElementById('rotuloContent');
          if (!content || !content.parentElement) return;

          const elements = Array.from(content.querySelectorAll('[data-size]'));

          const applyScale = (ratio) => {
            elements.forEach((el) => {
              const base = Number(el.getAttribute('data-size')) || 12;
              const min = Number(el.getAttribute('data-min')) || 7;
              const next = Math.max(min, Number((base * ratio).toFixed(2)));
              el.style.fontSize = next + 'mm';
            });
            content.style.gap = Math.max(2.4, Number((5.5 * ratio).toFixed(2))) + 'mm';
            content.style.paddingTop = Math.max(12, Number((18 * ratio).toFixed(2))) + 'mm';
            content.style.paddingBottom = Math.max(5, Number((8 * ratio).toFixed(2))) + 'mm';
          };

          const fits = () =>
            content.scrollHeight <= content.parentElement.clientHeight
            && content.scrollWidth <= content.parentElement.clientWidth;

          const fitContent = () => {
            applyScale(1);
            if (fits()) return;

            let low = 0.28;
            let high = 1;
            let best = low;

            applyScale(low);
            if (!fits()) {
              return;
            }

            for (let i = 0; i < 24; i += 1) {
              const mid = (low + high) / 2;
              applyScale(mid);
              if (fits()) {
                best = mid;
                low = mid;
              } else {
                high = mid;
              }
            }

            applyScale(best);
          };

          window.addEventListener('resize', fitContent);
          window.addEventListener('load', fitContent);
          setTimeout(fitContent, 0);
        })();
      </script>
    </body>
  </html>
`;

const RotulosPage = () => {
  const [documento, setDocumento] = useState('');
  const [destino, setDestino] = useState('');
  const [agencia, setAgencia] = useState('SHALOM');
  const [agenciaOtro, setAgenciaOtro] = useState('');
  const [nombre, setNombre] = useState('');
  const [consultaMensaje, setConsultaMensaje] = useState('');
  const [consultando, setConsultando] = useState(false);
  const consultaRef = useRef(0);

  const tipoDocumento = obtenerTipoDocumento(documento);
  const agenciaImpresion = agencia === AGENCIA_OTROS ? agenciaOtro.trim() : agencia.trim();
  const rutaImpresion = [agenciaImpresion, destino.trim()].filter(Boolean).join(' - ');

  useEffect(() => {
    const documentoActual = normalizarDocumento(documento);
    const tipoActual = obtenerTipoDocumento(documentoActual);
    let activa = true;

    consultaRef.current += 1;
    const consultaId = consultaRef.current;

    if (!documentoActual || !tipoActual) {
      setConsultando(false);
      setConsultaMensaje('');
      setNombre('');
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setConsultando(true);
        setConsultaMensaje('');

        const resp =
          tipoActual === 'dni'
            ? await clientesService.consultaDni(documentoActual)
            : await clientesService.consultaRuc(documentoActual);

        if (!activa || consultaRef.current !== consultaId) return;

        if (resp.data?.success) {
          setNombre(construirNombreConsultado(tipoActual, resp.data));
          setConsultaMensaje(`${tipoActual.toUpperCase()} consultado automaticamente.`);
        } else {
          setNombre('');
          setConsultaMensaje(
            resp.data?.error || `No se encontraron datos para el ${tipoActual.toUpperCase()}.`
          );
        }
      } catch (err) {
        if (!activa || consultaRef.current !== consultaId) return;
        console.error(`Error consultando ${tipoActual.toUpperCase()}:`, err);
        setNombre('');
        setConsultaMensaje(`Error consultando ${tipoActual.toUpperCase()}.`);
      } finally {
        if (activa && consultaRef.current === consultaId) {
          setConsultando(false);
        }
      }
    }, 350);

    return () => {
      activa = false;
      window.clearTimeout(timeoutId);
    };
  }, [documento]);

  const handleImprimir = () => {
    const documentoVal = normalizarDocumento(documento);
    const tipoDocumentoVal = obtenerTipoDocumento(documentoVal);
    const destinoVal = destino.trim();
    const nombreVal = nombre.trim();
    const agenciaOtroVal = agenciaOtro.trim();
    const agenciaVal = agencia === AGENCIA_OTROS ? agenciaOtroVal : agencia.trim();
    const rutaVal = [agenciaVal, destinoVal].filter(Boolean).join(' - ');

    if (!tipoDocumentoVal) {
      window.alert('Ingresa un DNI de 8 digitos o un RUC de 11 digitos.');
      return;
    }

    if (agencia === AGENCIA_OTROS && !agenciaOtroVal) {
      window.alert('Completa la agencia manual cuando selecciones OTRO.');
      return;
    }

    if (!destinoVal) {
      window.alert('Completa el destino para imprimir.');
      return;
    }

    const win = window.open('', '_blank');
    if (!win) {
      window.alert('Bloqueador de popups: permite abrir la pestana para imprimir el rotulo.');
      return;
    }

    win.document.open();
    win.document.write(
      construirHtmlImpresion({
        documento: documentoVal,
        tipoDocumento: tipoDocumentoVal,
        nombre: nombreVal || '-',
        ruta: rutaVal
      })
    );
    win.document.close();
    win.focus();
  };

  return (
    <div className="rotulos-container">
      <div className="rotulos-header">
        <h1>Rotulos</h1>
        <p>Imprime rotulos en A4 horizontal con ajuste automatico a una sola hoja.</p>
      </div>

      <div className="rotulos-card">
        <div className="form-row">
          <div className="form-group">
            <label>Documento (DNI/RUC)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={11}
              value={documento}
              onChange={(e) => setDocumento(normalizarDocumento(e.target.value))}
              placeholder="8 digitos para DNI o 11 para RUC"
            />
            <span className="helper-text helper-text--muted">
              Consulta automatica al completar 8 digitos de DNI o 11 de RUC.
            </span>
            {nombre && (
              <span className="helper-text">
                {tipoDocumento === 'ruc' ? 'Razon social' : 'Nombre'}: {nombre}
              </span>
            )}
            {consultando && (
              <span className="helper-text">Consultando {tipoDocumento.toUpperCase()}...</span>
            )}
            {consultaMensaje && <span className="helper-text">{consultaMensaje}</span>}
          </div>
          <div className="form-group">
            <label>Destino</label>
            <input
              type="text"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              placeholder="Destino"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Agencia</label>
            <select value={agencia} onChange={(e) => setAgencia(e.target.value)}>
              <option value="SHALOM">SHALOM</option>
              <option value="MARVISUR">MARVISUR</option>
              <option value="OLVA">OLVA</option>
              <option value="TIENDA">TIENDA</option>
              <option value="OTROS">OTRO</option>
            </select>
          </div>
          {agencia === AGENCIA_OTROS && (
            <div className="form-group">
              <label>Agencia manual</label>
              <input
                type="text"
                value={agenciaOtro}
                onChange={(e) => setAgenciaOtro(e.target.value)}
                placeholder="Ingresa la agencia"
              />
            </div>
          )}
        </div>

        <div className="rotulos-preview">
          <span className="rotulos-preview__label">Ruta a imprimir</span>
          <strong>{rutaImpresion || '-'}</strong>
        </div>

        <div className="rotulos-actions">
          <button type="button" className="btn-primary" onClick={handleImprimir}>
            Imprimir rotulo
          </button>
        </div>
      </div>
    </div>
  );
};

export default RotulosPage;
