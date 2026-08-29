import { useState, useEffect } from 'react';
import { fetchHistory, deleteAnalysis, clearAllHistory } from '../services/api';

function getColor(label) {
  if (label === 'GOOD') return 'var(--status-good)';
  if (['BLUR', 'NOISY', 'UNDEREXPOSED', 'OVEREXPOSED'].includes(label)) return 'var(--status-degraded)';
  return 'var(--status-defective)';
}

export default function HistoryPage() {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchHistory();
      setHistory(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this analysis record?')) return;
    try {
      await deleteAnalysis(id);
      setHistory(prev => ({
        ...prev,
        total: prev.total - 1,
        items: prev.items.filter(i => i.id !== id)
      }));
    } catch (e) {
      alert('Failed to delete: ' + e.message);
    }
  };

  const handleClearAll = async () => {
    if (!history?.total || history.total === 0) return;
    if (!confirm(`Are you sure you want to delete all ${history.total} analysis records? This cannot be undone.`)) return;
    try {
      await clearAllHistory();
      setHistory({
        total: 0,
        items: []
      });
    } catch (e) {
      alert('Failed to clear history: ' + e.message);
    }
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="page">
      <div className="section-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Analysis History</h1>
          <p className="page-subtitle">
            All previously analyzed images with quality scores and defect labels.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={load} id="refresh-history-btn">
            ↻ Refresh
          </button>
          <button
            className="btn btn-danger"
            onClick={handleClearAll}
            id="clear-all-history-btn"
            disabled={!history?.total || history.total === 0}
            style={{
              background: (!history?.total || history.total === 0) ? 'rgba(255,255,255,0.05)' : 'rgba(239, 68, 68, 0.15)',
              color: (!history?.total || history.total === 0) ? 'var(--text-muted)' : '#ef4444',
              borderColor: (!history?.total || history.total === 0) ? 'rgba(255,255,255,0.1)' : 'rgba(239, 68, 68, 0.4)',
              cursor: (!history?.total || history.total === 0) ? 'not-allowed' : 'pointer',
              padding: '8px 16px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      {loading && <div className="spinner" />}

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
          <p style={{ color: 'var(--status-defective)' }}>Error: {error}</p>
        </div>
      )}

      {!loading && history && history.items.length === 0 && (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <h3>No analyses yet</h3>
          <p>Upload and analyze your first image to see results here.</p>
        </div>
      )}

      {!loading && history && history.items.length > 0 && (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
            {history.total} total record{history.total !== 1 ? 's' : ''}
          </p>
          <div className="history-grid">
            {history.items.map(item => (
              <div className="history-card" key={item.id} id={`history-item-${item.id}`}>
                {item.thumbnail_base64 ? (
                  <img
                    className="history-thumb"
                    src={`data:image/jpeg;base64,${item.thumbnail_base64}`}
                    alt={item.filename}
                  />
                ) : (
                  <div className="history-thumb-placeholder">No preview</div>
                )}
                <div className="history-info">
                  <div className="history-filename" title={item.filename}>{item.filename}</div>
                  <div className="history-score-row">
                    <span className="history-score" style={{ color: getColor(item.quality_label) }}>
                      {item.quality_score.toFixed(0)}/100
                    </span>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px',
                      borderRadius: '6px', color: getColor(item.quality_label),
                      background: `${getColor(item.quality_label)}22`
                    }}>
                      {item.quality_label}
                    </span>
                  </div>
                  <div className="history-date">{formatDate(item.timestamp)}</div>
                  <button
                    className="btn btn-danger"
                    style={{ marginTop: '0.5rem', padding: '4px 10px', fontSize: '0.7rem', width: '100%' }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    id={`delete-history-${item.id}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
