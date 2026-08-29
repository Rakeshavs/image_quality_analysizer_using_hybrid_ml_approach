import { useState } from 'react';
import './index.css';
import InspectorPage from './pages/InspectorPage';
import HistoryPage from './pages/HistoryPage';
import MetricsPage from './pages/MetricsPage';

const NAV_ITEMS = [
  { id: 'inspector', label: '🔍 Inspector' },
  { id: 'history', label: '📋 History' },
  { id: 'metrics', label: '📊 Model Metrics' },
];

export default function App() {
  const [activePage, setActivePage] = useState('inspector');

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1"/>
                <stop offset="100%" stopColor="#a78bfa"/>
              </linearGradient>
            </defs>
            <rect x="3" y="3" width="18" height="18" rx="3" fill="url(#logo-grad)" opacity="0.2" stroke="url(#logo-grad)" strokeWidth="1.5"/>
            <circle cx="12" cy="11" r="3" stroke="url(#logo-grad)" strokeWidth="1.5"/>
            <path d="M5 19l4-5 3 3 3-4 4 6" stroke="url(#logo-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          AI Image Quality Inspector
        </div>

        <ul className="navbar-nav">
          {NAV_ITEMS.map(({ id, label }) => (
            <li key={id}>
              <button
                className={`nav-btn${activePage === id ? ' active' : ''}`}
                onClick={() => setActivePage(id)}
                id={`nav-${id}`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main>
        {activePage === 'inspector' && <InspectorPage />}
        {activePage === 'history' && <HistoryPage />}
        {activePage === 'metrics' && <MetricsPage />}
      </main>
    </>
  );
}
