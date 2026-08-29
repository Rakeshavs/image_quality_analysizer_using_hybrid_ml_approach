import { useState, useCallback } from 'react';
import UploadZone from '../components/UploadZone';
import ScoreGauge from '../components/ScoreGauge';
import ExplainabilityPanel from '../components/ExplainabilityPanel';
import IssueList from '../components/IssueList';
import StatCard from '../components/StatCard';
import { analyzeImage } from '../services/api';

function getLabelForScore(label) {
  if (label === 'GOOD') return 'ACCEPTABLE';
  if (['BLUR', 'NOISY', 'UNDEREXPOSED', 'OVEREXPOSED'].includes(label)) return 'DEGRADED';
  if (label === 'CORRUPTED') return 'DEFECTIVE';
  return label;
}

export default function InspectorPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelected = useCallback((f) => {
    setFile(f);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  }, []);

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeImage(file);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const stats = result?.statistics;
  const displayLabel = result ? getLabelForScore(result.quality_label) : '';

  return (
    <div className="page">
      <h1 className="page-title">Image Quality Inspector</h1>
      <p className="page-subtitle">
        Upload an image to analyze its quality using our hybrid CV + ML pipeline.
      </p>

      {!result && !loading && (
        <>
          <UploadZone onFileSelected={handleFileSelected} disabled={loading} />

          {file && (
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleAnalyze} id="analyze-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Analyze Image
              </button>
              <button className="btn btn-ghost" onClick={handleReset} id="reset-btn">
                Clear
              </button>
            </div>
          )}

          {file && preview && (
            <div style={{ marginTop: '1.5rem', maxWidth: '400px', margin: '1.5rem auto 0' }}>
              <div className="card">
                <div className="section-header">
                  <span className="section-title">Selected Image</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                <div className="image-preview-wrap">
                  <img src={preview} alt="Preview" />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="analyzing-state">
          <div className="spinner" />
          <p>Extracting visual features and running ML analysis...</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Blur · Exposure · Noise · Contrast · Entropy
          </p>
        </div>
      )}

      {error && (
        <div className="card" style={{ marginTop: '1.5rem', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
          <p style={{ color: 'var(--status-defective)' }}>⚠ Analysis failed: {error}</p>
          <button className="btn btn-ghost" style={{ marginTop: '1rem' }} onClick={handleReset}>Try Again</button>
        </div>
      )}

      {result && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-ghost" onClick={handleReset} id="new-analysis-btn">
              ＋ New Analysis
            </button>
          </div>

          <div className="results-grid">
            {/* LEFT COLUMN */}
            <div className="results-left">
              {/* Image Preview */}
              <div className="card">
                <div className="section-header" style={{ marginBottom: '0.75rem' }}>
                  <span className="section-title">Image Preview</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {result.image_width}×{result.image_height}px
                  </span>
                </div>
                <div className="image-preview-wrap">
                  <img src={preview} alt={file?.name} />
                  <div className="image-meta">{file?.name}</div>
                </div>
              </div>

              {/* Score Gauge */}
              <div className="card" style={{ textAlign: 'center' }}>
                <div className="section-header" style={{ marginBottom: '1.25rem', justifyContent: 'center' }}>
                  <span className="section-title">Quality Score</span>
                </div>
                <ScoreGauge score={result.quality_score} label={displayLabel} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  Detected class: <strong style={{ color: 'var(--text-secondary)' }}>{result.quality_label}</strong>
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="results-right">
              {/* Explainability */}
              <div className="card">
                <div className="section-header">
                  <span className="section-title">Why this score?</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Sub-dimension breakdown
                  </span>
                </div>
                <ExplainabilityPanel explainability={result.explainability} />
              </div>

              {/* Issues */}
              <div className="card">
                <div className="section-header">
                  <span className="section-title">Detected Issues</span>
                  <span style={{
                    fontSize: '0.75rem',
                    background: result.issues.length ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                    color: result.issues.length ? 'var(--status-degraded)' : 'var(--status-good)',
                    padding: '2px 8px', borderRadius: '8px', fontWeight: 600
                  }}>
                    {result.issues.length} issue{result.issues.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <IssueList issues={result.issues} />
              </div>

              {/* Statistics */}
              {stats && (
                <div className="card">
                  <div className="section-header" style={{ marginBottom: '1rem' }}>
                    <span className="section-title">Image Statistics</span>
                  </div>
                  <div className="stats-grid">
                    <StatCard label="Brightness" value={stats.brightness} />
                    <StatCard label="Contrast" value={stats.contrast} />
                    <StatCard label="Sharpness" value={stats.sharpness} />
                    <StatCard label="Noise Level" value={stats.noise_level} />
                    <StatCard label="Entropy" value={stats.entropy} />
                    <StatCard label="Saturation" value={stats.saturation} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
