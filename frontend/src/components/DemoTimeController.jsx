import React, { useState } from 'react';
import { Sparkles, Clock, Plus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function DemoTimeController({ onSimulate, currentDemoDays = 0, vehicleNumber = null }) {
  const { t } = useLanguage();
  const [customDays, setCustomDays] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleApply = async (days) => {
    setLoading(true);
    try {
      await onSimulate(days);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="demo-time-box">
      <div>
        <h4>
          <Sparkles size={16} color="#d97706" />
          <span>{t('demoTimeSimulation')}</span>
        </h4>
        <p style={{ fontSize: '12px', color: '#78350f', marginTop: '2px' }}>
          {vehicleNumber
            ? `Simulating duration for ${vehicleNumber} (+${currentDemoDays} ${t('days')})`
            : t('demoTimeSub')}
        </p>
      </div>

      <div className="demo-btn-group">
        <button
          className={`btn btn-sm ${currentDemoDays === 0 ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleApply(0)}
          disabled={loading}
          title={t('actualTime')}
        >
          <Clock size={13} />
          <span>{t('actualTime')}</span>
        </button>

        <button
          className={`btn btn-sm ${currentDemoDays === 1 ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleApply(1)}
          disabled={loading}
        >
          <span>{t('add1Day')}</span>
        </button>

        <button
          className={`btn btn-sm ${currentDemoDays === 2 ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleApply(2)}
          disabled={loading}
        >
          <span>{t('add2Days')}</span>
        </button>

        <button
          className={`btn btn-sm ${currentDemoDays === 3 ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => handleApply(3)}
          disabled={loading}
        >
          <span>{t('add3Days')}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="number"
            min="1"
            max="30"
            value={customDays}
            onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
            style={{ width: '55px', padding: '4px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
          />
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleApply(customDays)}
            disabled={loading}
          >
            <Plus size={12} />
            <span>{t('applyDays')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
