import React, { useState } from 'react';
import { clientesService } from '../../../core/services/apiServices';
import '../styles/RotulosPage.css';

const RotulosPage = () => {
  const [dni, setDni] = useState('');
  const [destino, setDestino] = useState('');
  const [agencia, setAgencia] = useState('SHALOM');
  const [nombre, setNombre] = useState('');
  const [consultaMensaje, setConsultaMensaje] = useState('');
  const [consultando, setConsultando] = useState(false);

  const escapeHtml = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const handleImprimir = () => {
    const dniVal = dni.trim();
    const destinoVal = destino.trim();
    const nombreVal = nombre.trim();
    if (!dniVal || !destinoVal) {
      window.alert('Completa DNI y destino para imprimir.');
      return;
    }

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Rotulo</title>
          <style>
            body {
              margin: 0;
              font-family: 'IBM Plex Sans', sans-serif;
              display: flex;
              align-items: flex-start;
              justify-content: flex-start;
              min-height: 100vh;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sheet {
              width: calc(297mm - 16mm);
              height: calc(210mm - 16mm);
              margin: 8mm;
              border: 3px solid #f5b000;
              border-radius: 8mm;
              padding: 10mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              gap: 6mm;
              text-align: center;
              position: relative;
              background: #fff;
            }
            .watermark {
              position: absolute;
              inset: 16mm 20mm;
              display: grid;
              place-items: center;
              opacity: 0.12;
              pointer-events: none;
              z-index: 0;
            }
            .watermark img { width: 100%; height: 100%; object-fit: contain; }
            .logo { width: 50mm; position: absolute; top: 8mm; left: 8mm; }
            .content {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: flex-start;
              gap: 6mm;
              padding-top: 10mm;
              z-index: 1;
            }
            .header { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; }
            .dni { font-size: 22mm; font-weight: 900; color: #0f3f91; letter-spacing: 0.04em; width: 100%; text-align: center; margin: 0; }
            .nombre { font-size: 30mm; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.02; margin: 0; }
            .destino { font-size: 20mm; font-weight: 900; color: #0f3f91; text-transform: uppercase; line-height: 1.08; margin: 0; }
            .agencia { font-size: 18mm; font-weight: 900; color: #0f3f91; text-transform: uppercase; line-height: 1.08; margin: 0; }
            .print-btn { position: fixed; top: 12px; right: 12px; padding: 10px 16px; border-radius: 999px; border: 1px solid #cbd5f5; background: #fff; cursor: pointer; }
            @media print {
              .print-btn { display: none; }
              body { min-height: auto; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">Imprimir</button>
          <div class="sheet">
            <div class="watermark"><img src="/static/img/KRATOS_LOGO.png" alt="" /></div>
            <img src="/static/img/KRATOS_LOGO.png" class="logo" alt="Kratos" />
            <div class="content" id="rotuloContent">
              <div class="header">
                <div class="dni" data-base="22">DNI ${escapeHtml(dniVal)}</div>
              </div>
              <div class="nombre" data-base="30">${escapeHtml(nombreVal || '-')}</div>
              <div class="destino" data-base="20">${escapeHtml(destinoVal)}</div>
              ${agencia ? `<div class="agencia" data-base="18">${escapeHtml(agencia)}</div>` : ''}
            </div>
          </div>
          <script>
            (function () {
              const container = document.getElementById('rotuloContent');
              if (!container) return;
              const maxHeight = () => container.parentElement.clientHeight - 28;
              const elements = Array.from(container.querySelectorAll('[data-base]'));
              elements.forEach((el) => {
                const base = Number(el.getAttribute('data-base')) || 18;
                el.style.fontSize = base + 'mm';
              });
              let guard = 80;
              while (container.scrollHeight > maxHeight() && guard-- > 0) {
                elements.forEach((el) => {
                  const current = parseFloat(el.style.fontSize);
                  const next = Math.max(current - 0.6, 10);
                  el.style.fontSize = next + 'mm';
                });
              }
            })();
          </script>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) {
      window.alert('Bloqueador de popups: permite abrir la pestana para imprimir el rotulo.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const handleConsultarDni = async () => {
    setConsultaMensaje('');
    const dniVal = dni.trim();
    if (!/^\d{8}$/.test(dniVal)) {
      setConsultaMensaje('El DNI debe tener 8 digitos.');
      return;
    }
    try {
      setConsultando(true);
      const resp = await clientesService.consultaDni(dniVal);
      if (resp.data?.success) {
        const nombreCompleto = `${resp.data.nombre || ''} ${resp.data.apellido || ''}`.trim();
        setNombre(nombreCompleto);
        setConsultaMensaje('Datos obtenidos.');
      } else {
        setNombre('');
        setConsultaMensaje(resp.data?.error || 'No se encontraron datos.');
      }
    } catch (err) {
      console.error('Error consultando DNI:', err);
      setNombre('');
      setConsultaMensaje('Error consultando DNI.');
    } finally {
      setConsultando(false);
    }
  };

  return (
    <div className="rotulos-container">
      <div className="rotulos-header">
        <h1>Rotulos</h1>
        <p>Imprime rotulos rapidos con DNI y destino.</p>
      </div>

      <div className="rotulos-card">
        <div className="form-row">
          <div className="form-group">
            <label>DNI</label>
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="Documento"
            />
            {nombre && <span className="helper-text">Nombre: {nombre}</span>}
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
              <option value="OTROS">OTROS</option>
            </select>
          </div>
          <div className="form-group form-group-actions">
            <div className="rotulos-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleConsultarDni}
                disabled={consultando}
              >
                {consultando ? 'Consultando...' : 'Consultar DNI'}
              </button>
              <button type="button" className="btn-primary" onClick={handleImprimir}>
                Imprimir rotulo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RotulosPage;
