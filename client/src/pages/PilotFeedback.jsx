import { useEffect, useState } from 'react';
import api from '../services/api';
import { ErrorBanner, SuccessBanner } from '../components/ui';

export default function PilotFeedback() {
  const [feedback, setFeedback] = useState([]);
  const [usage, setUsage] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
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

  const load = async () => {
    setError('');
    try {
      const [fb, us] = await Promise.all([
        api.get('/marketing/pilot-feedback'),
        api.get('/marketing/usage'),
      ]);
      setFeedback(fb.data || []);
      setUsage(us.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pilot data');
    }
  };

  useEffect(() => {
    load();
    api.post('/marketing/usage', { feature: 'pilot_feedback', action: 'view' }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/marketing/pilot-feedback', {
        ...form,
        week: Number(form.week) || 1,
        rating: Number(form.rating) || 4,
        featuresUsed: form.featuresUsed.split(',').map((s) => s.trim()).filter(Boolean),
        featuresNotUsed: form.featuresNotUsed.split(',').map((s) => s.trim()).filter(Boolean),
        painPoints: form.painPoints.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setSuccess('Feedback submitted successfully');
      setForm({
        week: Number(form.week) + 1,
        rating: 4,
        featuresUsed: '',
        featuresNotUsed: '',
        missedFollowUpCause: '',
        painPoints: '',
        suggestions: '',
        wouldRecommend: true,
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Pilot Feedback</h1>
        <p className="text-slate-500 text-sm">Phase 2 — Track usage and collect builder feedback</p>
      </div>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <div className="card p-5">
        <h3 className="font-semibold mb-4">Feature Usage (Pilot Data)</h3>
        <div className="space-y-2">
          {usage.map((u) => (
            <div key={u._id} className="flex justify-between text-sm border-b border-slate-100 py-2 last:border-0">
              <span className="capitalize">{String(u._id).replace(/_/g, ' ')}</span>
              <span className="font-medium">{u.count} actions</span>
            </div>
          ))}
          {usage.length === 0 && <p className="text-slate-500 text-sm">Usage data will appear as features are used</p>}
        </div>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <h3 className="font-semibold">Weekly Feedback Form</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Week #</label>
            <input className="input" type="number" min="1" value={form.week} onChange={(e) => setForm({ ...form, week: e.target.value })} required />
          </div>
          <div>
            <label className="label">Rating (1-5)</label>
            <input className="input" type="number" min="1" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} required />
          </div>
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
          <label className="label">Pain Points (comma separated)</label>
          <input className="input" value={form.painPoints} onChange={(e) => setForm({ ...form, painPoints: e.target.value })} />
        </div>
        <div>
          <label className="label">Suggestions</label>
          <textarea className="input" rows={3} value={form.suggestions} onChange={(e) => setForm({ ...form, suggestions: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.wouldRecommend}
            onChange={(e) => setForm({ ...form, wouldRecommend: e.target.checked })}
          />
          Would recommend AVR Growth OS
        </label>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>

      {feedback.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Previous Feedback</h3>
          {feedback.map((f) => (
            <div key={f._id} className="py-3 border-b last:border-0 text-sm">
              <p className="font-medium">Week {f.week} — {f.rating}/5 by {f.submittedBy?.name || '—'}</p>
              {f.featuresUsed?.length > 0 && (
                <p className="text-slate-500 mt-1">Used: {f.featuresUsed.join(', ')}</p>
              )}
              {f.suggestions && <p className="text-slate-600 mt-1">{f.suggestions}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
