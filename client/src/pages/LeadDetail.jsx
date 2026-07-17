import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, MessageCircle, Phone } from 'lucide-react';
import api from '../services/api';
import { StatusBadge, ScoreBadge, formatSource, formatDateTime, formatCurrency } from '../components/ui';

const parseAiData = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return { summary: String(value) };
  }
};

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [whatsappMsg, setWhatsappMsg] = useState('');

  const loadLead = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/leads/${id}`);
      setLead({ ...data, activities: data.activities || [] });
    } catch (err) {
      setLead(null);
      setError(err.response?.data?.message || 'Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLead();
  }, [id]);

  const addNote = async (e) => {
    e.preventDefault();
    await api.post(`/leads/${id}/notes`, { note });
    setNote('');
    loadLead();
  };

  const qualify = async () => {
    await api.post(`/leads/${id}/ai-qualify`);
    loadLead();
  };

  const sendWhatsapp = async () => {
    const { data } = await api.post(`/ai/whatsapp/${id}`);
    setWhatsappMsg(data.message);
    loadLead();
  };

  if (loading) {
    return <div className="animate-pulse h-64 card" />;
  }

  if (error || !lead) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Link to="/leads" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600">
          <ArrowLeft size={16} /> Back to leads
        </Link>
        <div className="card p-6">
          <p className="text-red-600">{error || 'Lead not found'}</p>
          <button type="button" onClick={loadLead} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const aiData = parseAiData(lead.aiQualificationData);
  const activities = lead.activities || [];

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/leads" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back to leads
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">{lead.name}</h1>
            <p className="text-slate-500 mt-1">{lead.phone} {lead.email && `• ${lead.email}`}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <StatusBadge status={lead.status} />
              <ScoreBadge score={lead.aiScore} />
              <span className="badge bg-slate-100 text-slate-600">{formatSource(lead.source)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={qualify} className="btn-secondary text-sm" type="button">
              <Sparkles size={16} /> AI Qualify
            </button>
            <button onClick={sendWhatsapp} className="btn-secondary text-sm" type="button">
              <MessageCircle size={16} /> AI WhatsApp
            </button>
          </div>
        </div>

        {whatsappMsg && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg text-sm">
            <p className="font-medium text-green-800 mb-1">AI WhatsApp Message:</p>
            <p className="text-green-900">{whatsappMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div>
            <p className="text-xs text-slate-500">Budget</p>
            <p className="font-medium">{lead.budget ? `${formatCurrency(lead.budget.min)} - ${formatCurrency(lead.budget.max)}` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">BHK Preference</p>
            <p className="font-medium">{lead.bhkPreference || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Timeline</p>
            <p className="font-medium">{lead.timeline || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Assigned To</p>
            <p className="font-medium">{lead.assignedTo?.name || '—'}</p>
          </div>
        </div>

        {aiData && (
          <div className="mt-4 p-4 bg-violet-50 rounded-lg">
            <p className="text-sm font-medium text-violet-800 mb-1">AI Qualification</p>
            <p className="text-sm text-violet-900">{aiData.summary || JSON.stringify(aiData)}</p>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-display font-semibold mb-4">Add Note / Call Summary</h2>
        <form onSubmit={addNote} className="flex gap-3">
          <input className="input flex-1" placeholder="Call summary or note..." value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="submit" className="btn-primary">Save</button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
          <Phone size={18} /> Activity History
        </h2>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-slate-500 text-sm">No activity yet</p>
          ) : (
            [...activities].reverse().map((act) => (
              <div key={act._id || act.id} className="flex gap-3 pb-4 border-b border-slate-100 last:border-0">
                <div className="w-2 h-2 rounded-full bg-brand-400 mt-2 shrink-0" />
                <div>
                  <p className="text-sm">{act.description || '—'}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {formatDateTime(act.createdAt)} • {(act.type || 'note').replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
