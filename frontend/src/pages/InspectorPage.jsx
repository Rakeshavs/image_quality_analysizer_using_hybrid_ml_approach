import { useState, useCallback } from 'react';
import UploadZone from '../components/UploadZone';
import ScoreGauge3D from '../components/ScoreGauge3D';
import Card3D from '../components/Card3D';
import ExplainabilityPanel from '../components/ExplainabilityPanel';
import IssueList from '../components/IssueList';
import StatCard from '../components/StatCard';
import { analyzeImage } from '../services/api';

function getLabelForScore(label) {
  if (label === 'GOOD') return 'OPTIMAL';
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
      <div className="page-hero">
        <h1 className="page-title-large">3D Image Quality Studio</h1>
        <p className="page-subtitle">
          Next-generation hybrid computer vision & ML defect analysis engine with sub-pixel explainability.
        </p>
      </div>

      {!result && !loading && (
        <Card3D glowColor="rgba(99, 102, 241, 0.2)">
          <UploadZone onFileSelected={handleFileSelected} disabled={loading} />

          {file && (
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button className="btn-3d btn-primary-3d" onClick={handleAnalyze} id="analyze-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Analyze Image Quality
              </button>
              <button className="btn-3d btn-ghost-3d" onClick={handleReset} id="reset-btn">
                Clear
              </button>
            </div>
          )}

          {file && preview && (
            <div style={{ marginTop: '1.5rem', maxWidth: '420px', margin: '1.5rem auto 0' }}>
              <div className="section-header">
                <span className="section-title">Selected Image</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <div className="image-preview-3d">
                <img src={preview} alt="Preview" />
              </div>
            </div>
          )}
        </Card3D>
      )}

      {loading && (
        <Card3D glowColor="rgba(139, 92, 246, 0.3)" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div className="spinner" />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '1rem 0 0.5rem' }}>Extracting 3D Feature Topography...</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Processing Laplacian sharpness variance, Shannon entropy, & high-frequency spatial noise.
          </p>
        </Card3D>
      )}

      {error && (
        <Card3D glowColor="rgba(239, 68, 68, 0.3)" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.05)' }}>
          <p style={{ color: 'var(--status-defective)', fontWeight: 600 }}>⚠ Analysis Error: {error}</p>
          <button className="btn-3d btn-ghost-3d" style={{ marginTop: '1rem' }} onClick={handleReset}>Try Again</button>
        </Card3D>
      )}

      {result && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
            <button className="btn-3d btn-ghost-3d" onClick={handleReset} id="new-analysis-btn">
              ＋ Inspect Another Image
            </button>
          </div>

          <div className="results-grid-3d">
            {/* LEFT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Image Preview */}
              <Card3D glowColor="rgba(6, 182, 212, 0.25)">
                <div className="section-header">
                  <span className="section-title">Visual Canvas</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {result.image_width}×{result.image_height}px
                  </span>
                </div>
                <div className="image-preview-3d">
                  <img src={preview} alt={file?.name} />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                  {file?.name}
                </div>
              </Card3D>

              {/* Score Gauge */}
              <Card3D glowColor="rgba(99, 102, 241, 0.3)" style={{ textAlign: 'center' }}>
                <div className="section-header" style={{ justifyContent: 'center' }}>
                  <span className="section-title">Quality Index</span>
                </div>
                <ScoreGauge3D score={result.quality_score} label={displayLabel} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                  Classifier label: <strong style={{ color: 'var(--text-primary)' }}>{result.quality_label}</strong>
                </p>
              </Card3D>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Explainability */}
              <Card3D glowColor="rgba(139, 92, 246, 0.25)">
                <div className="section-header">
                  <span className="section-title">Feature Explainability</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Visual sub-dimension scores
                  </span>
                </div>
                <ExplainabilityPanel explainability={result.explainability} />
              </Card3D>

              {/* Issues */}
              <Card3D glowColor="rgba(245, 158, 11, 0.25)">
                <div className="section-header">
                  <span className="section-title">Defect Diagnostics</span>
                  <span style={{
                    fontSize: '0.75rem',
                    background: result.issues.length ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                    color: result.issues.length ? 'var(--status-degraded)' : 'var(--status-good)',
                    padding: '4px 10px', borderRadius: '12px', fontWeight: 700
                  }}>
                    {result.issues.length} flag{result.issues.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <IssueList issues={result.issues} />
              </Card3D>

              {/* Statistics */}
              {stats && (
                <Card3D glowColor="rgba(16, 185, 129, 0.2)">
                  <div className="section-header">
                    <span className="section-title">OpenCV Feature Metrics</span>
                  </div>
                  <div className="stats-grid-3d">
                    <StatCard label="Brightness" value={stats.brightness} />
                    <StatCard label="Contrast" value={stats.contrast} />
                    <StatCard label="Sharpness" value={stats.sharpness} />
                    <StatCard label="Noise Std" value={stats.noise_level} />
                    <StatCard label="Entropy" value={stats.entropy} />
                    <StatCard label="Saturation" value={stats.saturation} />
                  </div>
                </Card3D>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
