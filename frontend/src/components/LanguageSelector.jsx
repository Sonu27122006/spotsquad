import React from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSelector({ variant = 'dropdown', className = '' }) {
  const { language, setLanguage, languages } = useLanguage();

  if (variant === 'prominent' || variant === 'banner') {
    return (
      <div
        className={className}
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          border: '1.5px solid #bfdbfe',
          borderRadius: '16px',
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: '#2563eb',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Globe size={16} />
          </div>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a8a' }}>Select System Display Language / மொழியை தேர்ந்தெடுக்கவும்</h4>
            <p style={{ fontSize: '11px', color: '#64748b' }}>Choose your preferred regional language</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
          {languages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                style={{
                  background: isSelected ? '#2563eb' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#1e293b',
                  border: `1.5px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`,
                  borderRadius: '10px',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.25)' : 'none',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{lang.nativeName}</span>
                  {isSelected && <Check size={12} strokeWidth={3} />}
                </div>
                <div style={{ fontSize: '10px', opacity: isSelected ? 0.9 : 0.65 }}>
                  {lang.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === 'buttons') {
    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} className={className}>
        {languages.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setLanguage(lang.code)}
              style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span style={{ fontWeight: 700 }}>{lang.nativeName}</span>
              <span style={{ fontSize: '10px', opacity: 0.75 }}>({lang.name})</span>
              {isSelected && <Check size={12} />}
            </button>
          );
        })}
      </div>
    );
  }

  // Header Dropdown Mode
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        borderRadius: '10px',
        padding: '5px 12px',
        boxShadow: 'var(--shadow-sm)',
      }}
      className={className}
    >
      <Globe size={16} color="#2563eb" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={{
          border: 'none',
          background: 'transparent',
          fontSize: '13px',
          fontWeight: 700,
          color: '#1e293b',
          cursor: 'pointer',
          outline: 'none',
          fontFamily: 'inherit',
        }}
        title="Select Language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
}
