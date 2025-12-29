import React, { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import { getImageUrl } from '../utils/imageUrl.js';

export default function FeeDistributionModal({ isOpen, onClose, token, onSave }) {
  const [feeDistribution, setFeeDistribution] = useState({
    holders: 0,
    dev: 0,
    flywheel: 0,
    supportPonk: 0,
  });

  useEffect(() => {
    if (token?.feeDistribution) {
      setFeeDistribution({
        holders: token.feeDistribution.holders || 0,
        dev: token.feeDistribution.dev || 0,
        flywheel: token.feeDistribution.flywheel || 0,
        supportPonk: token.feeDistribution.supportPonk || 0,
      });
    } else {
      // Default distribution
      setFeeDistribution({
        holders: 50,
        dev: 30,
        flywheel: 10,
        supportPonk: 10,
      });
    }
  }, [token]);

  const handleChange = (field, value) => {
    const numValue = Math.max(0, Math.min(100, parseFloat(value) || 0));
    setFeeDistribution(prev => ({ ...prev, [field]: numValue }));
  };

  const getTotal = () => {
    return Object.values(feeDistribution).reduce((sum, val) => sum + val, 0);
  };

  const handleSave = () => {
    const total = getTotal();
    if (total !== 100) {
      // This shouldn't happen due to disabled button, but just in case
      return;
    }
    onSave(feeDistribution);
  };

  const total = getTotal();
  const isValid = total === 100;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fee Distribution" size="md">
      <div className="space-y-6">
        {token && (
          <div className="bg-dark-800 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                {token.imageUrl ? (
                  <img src={getImageUrl(token.imageUrl)} alt={token.name} className="w-full h-full rounded-xl object-cover" />
                ) : (
                  token.name?.charAt(0).toUpperCase() || 'T'
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{token.name}</h3>
                <p className="text-sm text-gray-400">{token.symbol}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Holders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-300">Holders</label>
              <span className="text-sm text-gray-400">{feeDistribution.holders}%</span>
            </div>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={feeDistribution.holders}
              onChange={(e) => handleChange('holders', e.target.value)}
              className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Dev */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-300">Dev</label>
              <span className="text-sm text-gray-400">{feeDistribution.dev}%</span>
            </div>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={feeDistribution.dev}
              onChange={(e) => handleChange('dev', e.target.value)}
              className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Flywheel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-300">Flywheel</label>
              <span className="text-sm text-gray-400">{feeDistribution.flywheel}%</span>
            </div>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={feeDistribution.flywheel}
              onChange={(e) => handleChange('flywheel', e.target.value)}
              className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Support BONKv2 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-300">Support PONK</label>
              <span className="text-sm text-gray-400">{feeDistribution.supportPonk}%</span>
            </div>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={feeDistribution.supportPonk}
              onChange={(e) => handleChange('supportPonk', e.target.value)}
              className="w-full px-4 py-3 bg-dark-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Total */}
        <div className="bg-dark-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-300">Total</span>
            <span className={`text-lg font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
              {total}%
            </span>
          </div>
          {!isValid && (
            <p className="text-xs text-red-400 mt-2">Total must equal 100%</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-dark-800 rounded-xl hover:bg-dark-700 transition-colors font-semibold text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="flex-1 px-4 py-3 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Distribution
          </button>
        </div>
      </div>
    </Modal>
  );
}

