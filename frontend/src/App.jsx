import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

function Toast({ message, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className={`toast toast-${type}`}>{type === 'success' ? '✓' : '✗'} {message}</div>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('tracker');
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState('');
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingQA, setLoadingQA] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    cycle_day: 1,
    pain_level: 5,
    primary_location: 'Pelvic',
    gi_distress: false,
    fatigue_level: 4,
    notes: ''
  });

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/symptoms`);
      const data = await res.json();
      if (data.status === 'success') setLogs(data.data);
    } catch (err) {
      console.error('Failed to load symptom logs:', err);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchLogs();
        addToast('Symptom log saved successfully');
        setFormData(prev => ({ ...prev, notes: '', pain_level: 5, fatigue_level: 4, gi_distress: false }));
      } else {
        addToast('Failed to save log', 'error');
      }
    } catch {
      addToast('Connection error. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateSummary = async () => {
    setLoadingReport(true);
    setSummary('');
    try {
      const res = await fetch(`${API_BASE}/api/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: 'patient_01', entries: logs })
      });
      const data = await res.json();
      setSummary(data.summary || 'Unable to generate summary brief.');
    } catch {
      addToast('Error generating summary', 'error');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!qaQuestion.trim()) return;
    setLoadingQA(true);
    setQaAnswer('');
    try {
      const res = await fetch(`${API_BASE}/api/chat-qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: qaQuestion })
      });
      const data = await res.json();
      setQaAnswer(data.answer || 'No response received.');
    } catch {
      addToast('Error reaching AI assistant', 'error');
    } finally {
      setLoadingQA(false);
    }
  };

  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const tabs = [
    { key: 'tracker', label: 'Daily Tracker', icon: '📋' },
    { key: 'analytics', label: 'Analytics', icon: '📈' },
    { key: 'report', label: 'AI Brief', icon: '🩺' },
    { key: 'eduhub', label: 'Learn', icon: '💡' },
  ];

  return (
    <>
      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} message={t.message} type={t.type} onDone={() => removeToast(t.id)} />
        ))}
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-icon">{'🏥'}</div>
          <div className="header-text">
            <h1>EndoTrack</h1>
            <p>Symptom Tracking & AI Clinical Brief Assistant</p>
          </div>
        </div>
      </header>

      <div className="app-container">
        {/* Tabs */}
        <nav className="tab-nav">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Daily Tracker */}
        {activeTab === 'tracker' && (
          <div className="card">
            <h2 className="card-title">Log Today's Symptoms</h2>
            <p className="card-subtitle">Track your daily experience to build a comprehensive health profile.</p>

            <form onSubmit={handleFormSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">{'📅'}</span> Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={e => update('date', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span className="label-icon">{'🔄'}</span> Cycle Day
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    min="1"
                    max="45"
                    value={formData.cycle_day}
                    onChange={e => update('cycle_day', Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group full-width slider-group">
                  <div className="slider-header">
                    <label className="form-label">
                      <span className="label-icon">{'⚡'}</span> Pain Severity
                    </label>
                    <span className="slider-value">{formData.pain_level} / 10</span>
                  </div>
                  <input
                    type="range"
                    className="slider-track"
                    min="1"
                    max="10"
                    value={formData.pain_level}
                    onChange={e => update('pain_level', Number(e.target.value))}
                  />
                  <div className="slider-labels">
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                  </div>
                </div>

                <div className="form-group full-width slider-group">
                  <div className="slider-header">
                    <label className="form-label">
                      <span className="label-icon">{'💤'}</span> Fatigue Level
                    </label>
                    <span className="slider-value">{formData.fatigue_level} / 10</span>
                  </div>
                  <input
                    type="range"
                    className="slider-track"
                    min="1"
                    max="10"
                    value={formData.fatigue_level}
                    onChange={e => update('fatigue_level', Number(e.target.value))}
                  />
                  <div className="slider-labels">
                    <span>Low</span>
                    <span>Moderate</span>
                    <span>High</span>
                  </div>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">
                    <span className="label-icon">{'📍'}</span> Primary Pain Location
                  </label>
                  <select
                    className="form-select"
                    value={formData.primary_location}
                    onChange={e => update('primary_location', e.target.value)}
                  >
                    <option value="Pelvic">Pelvic / Lower Abdomen</option>
                    <option value="Lower Back">Lower Back</option>
                    <option value="Bowel/GI">Bowel / GI Tract</option>
                    <option value="Legs/Hips">Legs / Hips (Nerve Pain)</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.gi_distress}
                      onChange={e => update('gi_distress', e.target.checked)}
                    />
                    Experiencing GI Distress (Nausea, Severe Bloating, Bowel Pain)
                  </label>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">
                    <span className="label-icon">{'📝'}</span> Notes & Triggers
                  </label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    value={formData.notes}
                    onChange={e => update('notes', e.target.value)}
                    placeholder="Missed school/work, specific flare triggers, medication taken..."
                  />
                </div>

                <div className="form-group full-width">
                  <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%' }}>
                    {submitting ? <><span className="spinner" /> Saving...</> : <><span className="btn-icon">{'✓'}</span> Save Daily Log</>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && (
          <div className="card">
            <h2 className="card-title">Cycle Analytics</h2>
            <p className="card-subtitle">Visualize your pain and fatigue trends across cycle days.</p>

            {logs.length > 0 && (
              <div className="log-badge">
                {'📊'} {logs.length} entr{logs.length === 1 ? 'y' : 'ies'} recorded
              </div>
            )}

            {logs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">{'📉'}</div>
                <h3>No data yet</h3>
                <p>Log your first symptom entry in the Daily Tracker to see trends here.</p>
              </div>
            ) : (
              <div className="chart-container">
                <ResponsiveContainer>
                  <LineChart data={logs} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#5a6a7e' }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 12, fill: '#5a6a7e' }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        fontSize: '0.875rem'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.8125rem', paddingTop: '12px' }} />
                    <Line type="monotone" dataKey="pain_level" stroke="#e88d90" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Pain Severity" />
                    <Line type="monotone" dataKey="fatigue_level" stroke="#2e8a99" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Fatigue Level" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* AI Doctor Brief */}
        {activeTab === 'report' && (
          <div className="card">
            <h2 className="card-title">AI Doctor Consultation Brief</h2>
            <p className="card-subtitle">Generate a concise clinical summary from your logged history to share with your doctor.</p>

            {logs.length === 0 ? (
              <div className="info-banner">
                <span className="info-banner-icon">{'ℹ️'}</span>
                <span>Please record at least one symptom entry in the Daily Tracker before generating a report.</span>
              </div>
            ) : (
              <div className="log-badge">
                {'📋'} Analyzing {logs.length} logged entr{logs.length === 1 ? 'y' : 'ies'}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleGenerateSummary}
              disabled={loadingReport || logs.length === 0}
            >
              {loadingReport
                ? <><span className="spinner" /> Analyzing with AI...</>
                : <><span className="btn-icon">{'🩺'}</span> Generate Brief for Doctor</>
              }
            </button>

            {summary && (
              <div className="ai-output">
                <div className="ai-output-label">{'🧠'} AI-Generated Clinical Brief</div>
                {summary}
              </div>
            )}
          </div>
        )}

        {/* Educational Hub */}
        {activeTab === 'eduhub' && (
          <div className="card">
            <h2 className="card-title">Endometriosis Learning Hub</h2>
            <p className="card-subtitle">Ask evidence-based questions about endometriosis, diagnosis, and support.</p>

            <form onSubmit={handleAskQuestion}>
              <div className="qa-input-row">
                <input
                  type="text"
                  className="form-input"
                  value={qaQuestion}
                  onChange={e => setQaQuestion(e.target.value)}
                  placeholder="e.g., What are early signs of endometriosis?"
                />
                <button type="submit" className="btn btn-primary" disabled={loadingQA || !qaQuestion.trim()}>
                  {loadingQA
                    ? <><span className="spinner" /> Searching...</>
                    : <><span className="btn-icon">{'🔍'}</span> Ask AI</>
                  }
                </button>
              </div>
            </form>

            {qaAnswer && (
              <div className="qa-response">
                <div className="ai-output-label">{'💡'} AI Response</div>
                {qaAnswer}
              </div>
            )}

            {!qaAnswer && !loadingQA && (
              <div className="empty-state">
                <div className="empty-icon">{'📚'}</div>
                <h3>Your AI Health Educator</h3>
                <p>Ask about symptoms, diagnostic pathways, treatment options, or daily management tips.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="app-footer">
        EndoTrack is a tracking tool and does not provide medical diagnosis. Always consult a healthcare professional.
      </footer>
    </>
  );
}
