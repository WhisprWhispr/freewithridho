import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmModal.css';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal-content">
        <button className="confirm-close-btn" onClick={onClose} disabled={isLoading}>
          <X size={18} />
        </button>
        <div className="confirm-icon-wrapper">
          <AlertTriangle size={32} className="confirm-icon" />
        </div>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Batal
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <span className="btn-spinner"></span> : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
