import { useState, useEffect } from 'react';
import { fetchModelInfo } from '../services/api';

export default function MetricsPage() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchModelInfo()
      .then(setInfo)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="spinner" /></div>;
  if (error) return (
    <div className="page">
      <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
        <p style={{ color: 'var(--status-defective)' }}>Error: {error}</p>
      </div>
    </div>
  );

  const featureImportances = info?.feature_importances || {};
  const maxImp = Math.max(...Object.values(featureImportances), 0.001);

  return (
    <div className="page">
      <h1 className="page-title">Model Performance</h1>
      <p className="page-subtitle">
        Evaluation metrics for the trained HybridImageQualityClassifier pipeline.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Model Name', value: info?.name || '—' },
          { label: 'Model Type', value: info?.type || '—' },
          { label: 'Status', value: info?.model_loaded ? '✅ Loaded' : '⚠ Not Trained' },
          { label: 'Accuracy', value: info?.accuracy ? `${(info.accuracy * 100).toFixed(1)}%` : '—' },
          { label: 'Weighted F1', value: info?.f1_score ? info.f1_score.toFixed(4) : '—' },
          { label: 'Version', value: info?.version || '1.0' },
        ].map(({ label, value }) => (
          <div className="card" key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
          </div>
        ))}
      </div>

      {Object.keys(featureImportances).length > 0 && (
        <div className="card">
          <div className="section-header" style={{ marginBottom: '1rem' }}>
            <span className="section-title">Feature Importances</span>
          </div>
          {Object.entries(featureImportances)
            .sort(([, a], [, b]) => b - a)
            .map(([name, imp]) => (
              <div className="metrics-feature-row" key={name}>
                <span className="metrics-feature-name">{name.replace(/_/g, ' ')}</span>
                <div className="metrics-bar-track">
                  <div
                    className="metrics-bar-fill"
                    style={{ width: `${(imp / maxImp) * 100}%` }}
                  />
                </div>
                <span className="metrics-feature-value">{(imp * 100).toFixed(1)}%</span>
              </div>
            ))}
        </div>
      )}

      {!info?.model_loaded && (
        <div className="card" style={{ marginTop: '1rem', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <p style={{ color: 'var(--status-degraded)', fontWeight: 600 }}>⚠ No trained model found</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Run the training script to generate model artifacts:
          </p>
          <pre style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '0.75rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
{`cd dataset_generator
python train_model.py`}
          </pre>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            The rule-based fallback classifier is currently active.
          </p>
        </div>
      )}
    </div>
  );
}
