import React from 'react';

const VentasModalShell = ({ title, onClose, children }) => (
  <div className="modal-overlay">
    <div className="modal-content ventas-modal">
      <div className="modal-header">
        <h2>{title}</h2>
        <button type="button" className="btn-icon" onClick={onClose}>
          X
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>
);

export default VentasModalShell;
