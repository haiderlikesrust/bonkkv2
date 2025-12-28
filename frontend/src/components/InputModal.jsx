import React, { useState } from 'react';
import Modal from './Modal.jsx';

export default function InputModal({ isOpen, onClose, onConfirm, title, message, placeholder, type = 'text', buttonText = 'Confirm', closeOnConfirm = true }) {
  const [value, setValue] = useState('');

  const handleConfirm = () => {
    if (value.trim()) {
      onConfirm(value);
      setValue('');
      if (closeOnConfirm) {
        onClose();
      }
    }
  };

  const handleClose = () => {
    setValue('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="sm">
      <div className="space-y-4">
        {message && <p className="text-gray-300">{message}</p>}
        <input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 bg-dark-800 rounded-xl hover:bg-dark-700 transition-colors font-semibold text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!value.trim()}
            className="flex-1 px-4 py-3 bg-gradient-hot rounded-xl hover:opacity-90 transition-opacity font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

