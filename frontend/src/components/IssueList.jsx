export default function IssueList({ issues }) {
  if (!issues || issues.length === 0) {
    return (
      <div className="no-issues-state">
        <div className="no-issues-icon">✅</div>
        <p style={{ color: 'var(--status-good)', fontWeight: 600 }}>No issues detected</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
          Image quality is acceptable
        </p>
      </div>
    );
  }

  const ICONS = {
    blur: '🔵',
    underexposure: '🌑',
    overexposure: '☀️',
    noise: '📡',
    corruption: '💥',
  };

  return (
    <div>
      {issues.map((issue, idx) => (
        <div className={`issue-card ${issue.severity}`} key={idx}>
          <span style={{ fontSize: '1.4rem' }}>{ICONS[issue.type] || '⚠️'}</span>
          <div className="issue-content">
            <div className="issue-type">{issue.type}</div>
            <div className="issue-description">{issue.description}</div>
            <div className="issue-confidence">
              Confidence: {(issue.confidence * 100).toFixed(1)}%
            </div>
          </div>
          <span className={`severity-badge ${issue.severity}`}>{issue.severity}</span>
        </div>
      ))}
    </div>
  );
}
