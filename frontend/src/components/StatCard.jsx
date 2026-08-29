export default function StatCard({ label, value, unit }) {
  return (
    <div className="stat-card">
      <div className="stat-value">
        {typeof value === 'number' ? value.toFixed(value < 1 ? 3 : 1) : value}
        {unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 2 }}>{unit}</span>}
      </div>
      <div className="stat-name">{label}</div>
    </div>
  );
}
