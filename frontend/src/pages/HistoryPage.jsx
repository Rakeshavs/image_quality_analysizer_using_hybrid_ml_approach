import { useState, useEffect } from 'react';
import Card3D from '../components/Card3D';
import { fetchHistory, deleteAnalysis, clearAllHistory } from '../services/api';

function getColor(label) {
  if (label === 'GOOD' || label === 'OPTIMAL') return 'var(--status-good)';
  if (['BLUR', 'NOISY', 'UNDEREXPOSED', 'OVEREXPOSED', 'DEGRADED'].includes(label)) return 'var(--status-degraded)';
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
    if (!confirm('Delete this inspection record?')) return;
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
    if (!confirm(`Delete all ${history.total} inspection logs?`)) return;
    try {
      await clearAllHistory();
      setHistory({ total: 0, items: [] });
    } catch (e) {
      alert('Failed to clear history: ' + e.message);
    }
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="page">
      <div className="page-hero" style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title-large" style={{ fontSize: '2.2rem' }}>Inspection Log Vault</h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Audit trail of image quality records, spatial defect tags, & metrics.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-3d btn-ghost-3d" onClick={load} id="refresh-history-btn">
            ↻ Refresh
          </button>
          <button
            className="btn-3d btn-ghost-3d"
            onClick={handleClearAll}
            id="clear-all-history-btn"
            disabled={!history?.total || history.total === 0}
            style={{ color: (!history?.total || history.total === 0) ? 'var(--text-muted)' : '#ef4444' }}
          >
            🗑 Clear All
          </button>
        </div>
      </div>

      {loading && <div className="spinner" />}

      {error && (
        <Card3D glowColor="rgba(239, 68, 68, 0.3)" style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
          <p style={{ color: 'var(--status-defective)' }}>Error: {error}</p>
        </Card3D>
      )}

      {!loading && history && history.items.length === 0 && (
        <Card3D style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📁</div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>No Inspections Logged</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Upload an image on the 3D Inspector tab to create your first record.</p>
        </Card3D>
      )}

      {!loading && history && history.items.length > 0 && (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Showing {history.total} inspection record{history.total !== 1 ? 's' : ''}
          </p>
          <div className="history-grid-3d">
            {history.items.map(item => (
              <Card3D key={item.id} glowColor={`${getColor(item.quality_label)}33`} id={`history-item-${item.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }} title={item.filename}>
                    {item.filename}
                  </span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px',
                    borderRadius: '8px', color: getColor(item.quality_label),
                    background: `${getColor(item.quality_label)}18`,
                    border: `1px solid ${getColor(item.quality_label)}44`
                  }}>
                    {item.quality_label}
                  </span>
                </div>

                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: getColor(item.quality_label), marginBottom: '0.5rem' }}>
                  {item.quality_score.toFixed(0)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ 100</span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {formatDate(item.timestamp)}
                </div>

                <button
                  className="btn-3d btn-ghost-3d"
                  style={{ width: '100%', justifyContent: 'center', padding: '6px', fontSize: '0.75rem', color: '#ef4444' }}
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                  id={`delete-history-${item.id}`}
                >
                  Delete Record
                </button>
              </Card3D>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
