import { useEffect, useState } from 'react';
import api from '../services/api';

export default function PilotFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [usage, setUsage] = useState([]);
  const [form, setForm] = useState({
    week: 1,
    rating: 4,
    featuresUsed: '',
    featuresNotUsed: '',
    missedFollowUpCause: '',
    painPoints: '',
    suggestions: '',
    wouldRecommend: true,
  });

  useEffect(() => {
    api.get('/marketing/pilot-feedback').then((res) => setFeedback(res.data));
    api.get('/marketing/usage').then((res) => setUsage(res.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post('/marketing/pilot-feedback', {
      ...form,
      featuresUsed: form.featuresUsed.split(',').map((s) => s.trim()).filter(Boolean),
      featuresNotUsed: form.featuresNotUsed.split(',').map((s) => s.trim()).filter(Boolean),
      painPoints: form.painPoints.split(',').map((s) => s.trim()).filter(Boolean),
    });
    alert('Feedback submitted!');
    const { data } = await api.get('/marketing/pilot-feedback');
    setFeedback(data);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Pilot Feedback</h1>
        <p className="text-slate-500 text-sm">Phase 2 — Track usage and collect builder feedback</p>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-4">Feature Usage (Pilot Data)</h3>
        <div className="space-y-2">
          {usage.map((u) => (
            <div key={u._id} className="flex justify-between text-sm">
              <span>{u._id}</span>
              <span className="font-medium">{u.count} actions</span>
            </div>
          ))}
          {usage.length === 0 && <p className="text-slate-500 text-sm">Usage data will appear as features are used</p>}
        </div>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <h3 className="font-semibold">Weekly Feedback Form</h3>
        <div>
          <label className="label">Week #</label>
          <input className="input" type="number" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} />
        </div>
        <div>
          <label className="label">Rating (1-5)</label>
          <input className="input" type="number" min="1" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} />
        </div>
        <div>
          <label className="label">Features Used (comma separated)</label>
          <input className="input" value={form.featuresUsed} onChange={(e) => setForm({ ...form, featuresUsed: e.target.value })} placeholder="leads, pipeline, follow-ups" />
        </div>
        <div>
          <label className="label">Features NOT Used</label>
          <input className="input" value={form.featuresNotUsed} onChange={(e) => setForm({ ...form, featuresNotUsed: e.target.value })} />
        </div>
        <div>
          <label className="label">Biggest cause of missed follow-ups</label>
          <textarea className="input" rows={2} value={form.missedFollowUpCause} onChange={(e) => setForm({ ...form, missedFollowUpCause: e.target.value })} />
        </div>
        <div>
          <label className="label">Suggestions</label>
          <textarea className="input" rows={3} value={form.suggestions} onChange={(e) => setForm({ ...form, suggestions: e.target.value })} />
        </div>
        <button type="submit" className="btn-primary">Submit Feedback</button>
      </form>

      {feedback.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Previous Feedback</h3>
          {feedback.map((f) => (
            <div key={f._id} className="py-3 border-b text-sm">
              <p className="font-medium">Week {f.week} — {f.rating}/5 by {f.submittedBy?.name}</p>
              <p className="text-slate-500 mt-1">{f.suggestions}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
