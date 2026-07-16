import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../services/api';
import { Modal, formatDateTime } from '../components/ui';

export default function FollowUps() {
  const [followUps, setFollowUps] = useState([]);
  const [leads, setLeads] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ lead: '', scheduledAt: '', type: 'call', notes: '' });

  const load = () => api.get('/follow-ups').then((res) => setFollowUps(res.data));

  useEffect(() => {
    load();
    api.get('/leads').then((res) => setLeads(res.data));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/follow-ups', form);
    setShowModal(false);
    setForm({ lead: '', scheduledAt: '', type: 'call', notes: '' });
    load();
  };

  const complete = async (id) => {
    const summary = prompt('Follow-up summary:');
    if (summary) {
      await api.patch(`/follow-ups/${id}/complete`, { summary });
      load();
    }
  };

  const pending = followUps.filter((f) => f.status === 'pending');
  const overdue = pending.filter((f) => new Date(f.scheduledAt) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Follow-ups</h1>
          <p className="text-slate-500 text-sm">{overdue.length} overdue • {pending.length} pending</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Schedule
        </button>
      </div>

      <div className="card divide-y">
        {followUps.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No follow-ups scheduled</p>
        ) : (
          followUps.map((f) => {
            const isOverdue = f.status === 'pending' && new Date(f.scheduledAt) < new Date();
            return (
              <div key={f._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <Link to={`/leads/${f.lead?._id}`} className="font-medium text-brand-600 hover:underline">
                    {f.lead?.name}
                  </Link>
                  <p className="text-sm text-slate-500 mt-1">
                    {formatDateTime(f.scheduledAt)} • {f.type} • {f.assignedTo?.name}
                  </p>
                  {f.notes && <p className="text-sm text-slate-600 mt-1">{f.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${isOverdue ? 'bg-red-100 text-red-700' : f.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isOverdue ? 'Overdue' : f.status}
                  </span>
                  {f.status === 'pending' && (
                    <button onClick={() => complete(f._id)} className="btn-secondary text-xs py-1">Complete</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Schedule Follow-up">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Lead</label>
            <select className="input" value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} required>
              <option value="">Select lead</option>
              {leads.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date & Time</label>
            <input className="input" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} required />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['call', 'visit', 'email', 'whatsapp', 'meeting'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary w-full">Schedule</button>
        </form>
      </Modal>
    </div>
  );
}
