import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function App() {
  const [activeTab, setActiveTab] = useState('tracker');
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState('');
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState('');
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingQA, setLoadingQA] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    cycle_day: 1,
    pain_level: 5,
    primary_location: 'Pelvic',
    gi_distress: false,
    fatigue_level: 4,
    notes: ''
  });

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // Fetch all symptom logs from backend
  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/symptoms`);
      const data = await res.json();
      if (data.status === 'success') {
        setLogs(data.data);
      }
    } catch (err) {
      console.error("Failed to load symptom logs:", err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Handle daily symptom form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/symptoms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        fetchLogs();
        alert("Daily symptom log saved successfully!");
        setFormData({
          ...formData,
          notes: '',
          pain_level: 5,
          fatigue_level: 4,
          gi_distress: false
        });
      }
    } catch (err) {
      console.error("Error saving symptom log:", err);
    }
  };

  // Trigger Gemini AI Doctor Summary generation
  const handleGenerateSummary = async () => {
    setLoadingReport(true);
    try {
      const res = await fetch(`${API_BASE}/api/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: "patient_01", entries: logs })
      });
      const data = await res.json();
      setSummary(data.summary || "Unable to generate summary brief.");
    } catch (err) {
      console.error("Error generating doctor summary:", err);
    } finally {
      setLoadingReport(false);
    }
  };

  // Trigger Gemini AI Educational QA
  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!qaQuestion.trim()) return;
    setLoadingQA(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat-qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: qaQuestion })
      });
      const data = await res.json();
      setQaAnswer(data.answer || "No response received.");
    } catch (err) {
      console.error("Error asking AI question:", err);
    } finally {
      setLoadingQA(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '850px', margin: '0 auto', color: '#2D3748' }}>
      
      {/* Header Banner */}
      <header style={{ borderBottom: '3px solid #1A525A', paddingBottom: '12px', marginBottom: '20px' }}>
        <h1 style={{ color: '#1A525A', margin: 0, fontSize: '2rem' }}>EndoTrack</h1>
        <p style={{ color: '#4A5568', margin: '6px 0 0 0' }}>Early Endometriosis Symptom Tracking & AI Clinical Brief Assistant</p>
      </header>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
        <button 
          onClick={() => setActiveTab('tracker')}
          style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'tracker' ? '#1A525A' : '#EDF2F7', color: activeTab === 'tracker' ? '#FFF' : '#2D3748', fontWeight: 'bold' }}>
          Daily Tracker
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'analytics' ? '#1A525A' : '#EDF2F7', color: activeTab === 'analytics' ? '#FFF' : '#2D3748', fontWeight: 'bold' }}>
          Cycle Analytics
        </button>
        <button 
          onClick={() => setActiveTab('report')}
          style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'report' ? '#1A525A' : '#EDF2F7', color: activeTab === 'report' ? '#FFF' : '#2D3748', fontWeight: 'bold' }}>
          AI Doctor Brief
        </button>
        <button 
          onClick={() => setActiveTab('eduhub')}
          style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'eduhub' ? '#1A525A' : '#EDF2F7', color: activeTab === 'eduhub' ? '#FFF' : '#2D3748', fontWeight: 'bold' }}>
          Educational Hub
        </button>
      </nav>

      {/* TAB 1: SYMPTOM TRACKER FORM */}
      {activeTab === 'tracker' && (
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#FAF9F6', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <h2 style={{ color: '#1A525A', marginTop: 0 }}>Log Today's Symptoms</h2>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <label style={{ flex: 1 }}>
              <strong>Date:</strong>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px' }} required />
            </label>
            <label style={{ flex: 1 }}>
              <strong>Cycle Day:</strong>
              <input type="number" min="1" max="45" value={formData.cycle_day} onChange={e => setFormData({...formData, cycle_day: Number(e.target.value)})} style={{ width: '100%', padding: '8px', marginTop: '4px' }} required />
            </label>
          </div>

          <label>
            <strong>Pain Severity Level (1 - 10): {formData.pain_level}</strong>
            <input type="range" min="1" max="10" value={formData.pain_level} onChange={e => setFormData({...formData, pain_level: Number(e.target.value)})} style={{ width: '100%', marginTop: '6px' }} />
          </label>

          <label>
            <strong>Fatigue Level (1 - 10): {formData.fatigue_level}</strong>
            <input type="range" min="1" max="10" value={formData.fatigue_level} onChange={e => setFormData({...formData, fatigue_level: Number(e.target.value)})} style={{ width: '100%', marginTop: '6px' }} />
          </label>

          <label>
            <strong>Primary Pain Location:</strong>
            <select value={formData.primary_location} onChange={e => setFormData({...formData, primary_location: e.target.value})} style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
              <option value="Pelvic">Pelvic / Lower Abdomen</option>
              <option value="Lower Back">Lower Back</option>
              <option value="Bowel/GI">Bowel / GI Tract</option>
              <option value="Legs/Hips">Legs / Hips (Nerve Pain)</option>
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={formData.gi_distress} onChange={e => setFormData({...formData, gi_distress: e.target.checked})} />
            <strong>Experiencing GI Distress (Nausea, Severe Bloating, Bowel Pain)</strong>
          </label>

          <label>
            <strong>Personal Notes / Triggers:</strong>
            <textarea rows="3" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Missed school/work, specific flare triggers..." style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
          </label>

          <button type="submit" style={{ backgroundColor: '#1A525A', color: '#FFF', padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
            Save Daily Log
          </button>
        </form>
      )}

      {/* TAB 2: CYCLE ANALYTICS */}
      {activeTab === 'analytics' && (
        <div style={{ backgroundColor: '#FAF9F6', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <h2 style={{ color: '#1A525A', marginTop: 0 }}>Pain Trends Over Cycle Days</h2>
          {logs.length === 0 ? (
            <p>No symptom logs logged yet. Go to Daily Tracker to log entry.</p>
          ) : (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={logs}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="pain_level" stroke="#E88D90" strokeWidth={3} name="Pain Severity (1-10)" />
                  <Line type="monotone" dataKey="fatigue_level" stroke="#2E8A99" strokeWidth={2} name="Fatigue Level (1-10)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AI DOCTOR CONSULTATION BRIEF */}
      {activeTab === 'report' && (
        <div style={{ backgroundColor: '#FAF9F6', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <h2 style={{ color: '#1A525A', marginTop: 0 }}>AI Doctor Consultation Brief</h2>
          <p>Synthesize logged history into a concise summary for your doctor visit.</p>
          
          <button 
            onClick={handleGenerateSummary} 
            disabled={loadingReport || logs.length === 0} 
            style={{ backgroundColor: logs.length === 0 ? '#A0AEC0' : '#2E8A99', color: '#FFF', padding: '10px 18px', border: 'none', borderRadius: '4px', cursor: logs.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
            {loadingReport ? 'Analyzing via Gemini AI...' : 'Generate Brief for Doctor'}
          </button>

          {logs.length === 0 && <p style={{ color: '#E88D90' }}>Please record at least one entry before generating a report.</p>}

          {summary && (
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#F2F7F7', borderLeft: '4px solid #1A525A', borderRadius: '0 4px 4px 0' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: '1.5', margin: 0 }}>{summary}</pre>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EDUCATIONAL HUB & AI Q&A */}
      {activeTab === 'eduhub' && (
        <div style={{ backgroundColor: '#FAF9F6', padding: '20px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <h2 style={{ color: '#1A525A', marginTop: 0 }}>Endometriosis Information & AI Assistant</h2>
          <p>Ask questions regarding endometriosis, diagnostic timelines, and lifestyle support.</p>

          <form onSubmit={handleAskQuestion} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="text" 
              value={qaQuestion} 
              onChange={e => setQaQuestion(e.target.value)} 
              placeholder="e.g., What are the common symptoms of bowel endometriosis?" 
              style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #CBD5E0' }} 
            />
            <button type="submit" disabled={loadingQA} style={{ backgroundColor: '#1A525A', color: '#FFF', padding: '10px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loadingQA ? 'Searching...' : 'Ask AI'}
            </button>
          </form>

          {qaAnswer && (
            <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #CBD5E0' }}>
              <strong>AI Response:</strong>
              <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{qaAnswer}</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
