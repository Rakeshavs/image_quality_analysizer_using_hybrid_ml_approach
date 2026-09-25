import { useEffect, useState } from 'react';
import { fetchHealth } from '../services/api';

const NAV_ITEMS = [
  { id: 'inspector', label: '🔍 3D Inspector' },
  { id: 'history', label: '📋 History Log' },
  { id: 'metrics', label: '📊 Model Architecture' },
];

export default function Navbar({ activePage, setActivePage }) {
  const [engineMode, setEngineMode] = useState('Checking...');

  useEffect(() => {
    fetchHealth().then(res => {
      if (res?.mode === 'client-side' || !res?.status) {
        setEngineMode('⚡ Browser AI Engine (Static)');
      } else {
        setEngineMode('🟢 Live FastAPI Backend');
      }
    }).catch(() => {
      setEngineMode('⚡ Browser AI Engine (Static)');
    });
  }, []);

  return (
    <nav className="navbar-3d">
      <div className="navbar-brand-wrap">
        <div className="logo-icon-3d">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="logo-cyan-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f2fe" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>
            <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#logo-cyan-grad)" opacity="0.25" stroke="url(#logo-cyan-grad)" strokeWidth="1.5" />
            <circle cx="12" cy="11" r="3.5" stroke="url(#logo-cyan-grad)" strokeWidth="1.5" />
            <path d="M5 19l4-5 3 3 3-4 4 6" stroke="url(#logo-cyan-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="logo-text-wrap">
          <span className="brand-title">AURA QUALITY Studio</span>
          <span className="brand-subtitle">Hybrid Vision & ML Inspector</span>
        </div>
      </div>

      <ul className="navbar-nav-3d">
        {NAV_ITEMS.map(({ id, label }) => (
          <li key={id}>
            <button
              className={`nav-btn-3d ${activePage === id ? 'active' : ''}`}
              onClick={() => setActivePage(id)}
              id={`nav-${id}`}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>

      <div className="engine-badge-3d" title="Operational Mode">
        <span className="badge-pulse-dot" />
        <span>{engineMode}</span>
      </div>
    </nav>
  );
}
