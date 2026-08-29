const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function analyzeImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchHistory(skip = 0, limit = 50) {
  const res = await fetch(`${API_BASE}/api/history?skip=${skip}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function fetchAnalysisById(id) {
  const res = await fetch(`${API_BASE}/api/history/${id}`);
  if (!res.ok) throw new Error('Not found');
  return res.json();
}

export async function deleteAnalysis(id) {
  const res = await fetch(`${API_BASE}/api/history/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
  return res.json();
}

export async function clearAllHistory() {
  const res = await fetch(`${API_BASE}/api/history`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Clear all history failed');
  return res.json();
}

export async function fetchModelInfo() {
  const res = await fetch(`${API_BASE}/api/model/info`);
  if (!res.ok) throw new Error('Failed to fetch model info');
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend unreachable');
  return res.json();
}
