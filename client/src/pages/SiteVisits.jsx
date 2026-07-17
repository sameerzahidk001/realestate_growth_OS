import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../services/api';
import {
  Modal,
  Pagination,
  formatDateTime,
  paginate,
  toDatetimeLocalValue,
  isValidDatetimeLocal,
  ErrorBanner,
} from '../components/ui';

export default function SiteVisits() {
  const [visits, setVisits] = useState([]);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ lead: '', project: '', scheduledAt: '' });
  const [editId, setEditId] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get('/site-visits').then((res) => setVisits(res.data));

  useEffect(() => {
    load();
    api.get('/leads').then((res) => setLeads(res.data));
    api.get('/projects').then((res) => setProjects(res.data));
  }, []);

  const resetForm = () => {
    setEditId('');
    setForm({ lead: '', project: '', scheduledAt: '' });
    setError('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!isValidDatetimeLocal(form.scheduledAt)) {
      setError('Please select both date and time');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      if (editId) await api.put(`/site-visits/${editId}`, form);
      else await api.post('/site-visits', form);
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save site visit');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status, feedback) => {
    setError('');
    try {
      await api.put(`/site-visits/${id}`, { status, feedback, completedAt: status === 'completed' ? new Date() : undefined });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update site visit');
    }
  };

  const openEdit = (v) => {
    setEditId(v._id);
    setForm({
      lead: v.lead?._id || '',
      project: v.project?._id || '',
      scheduledAt: toDatetimeLocalValue(v.scheduledAt),
    });
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this site visit?')) return;
    setError('');
    try {
      await api.delete(`/site-visits/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete site visit');
    }
  };

  const paged = useMemo(() => paginate(visits, page, 10), [visits, page]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Site Visits</h1>
          <p className="text-slate-500 text-sm">Schedule and track property visits</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary"
          type="button"
        >
          <Plus size={16} /> Schedule Visit
        </button>
      </div>

      <ErrorBanner message={error && !showModal ? error : ''} />

      <div className="grid gap-4">
        {paged.items.map((v) => (
          <div key={v._id} className="card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Link to={`/leads/${v.lead?._id}`} className="font-medium text-brand-600 hover:underline">
                  {v.lead?.name}
                </Link>
                <p className="text-sm text-slate-500 mt-1">
                  {v.project?.name} • {formatDateTime(v.scheduledAt)}
                </p>
                {v.feedback && <p className="text-sm mt-2 text-slate-600">Feedback: {v.feedback}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${
                  v.status === 'completed' ? 'bg-green-100 text-green-700' :
                  v.status === 'no_show' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{v.status}</span>
                {v.status === 'scheduled' && (
                  <>
                    <button onClick={() => {
                      const fb = prompt('Visit feedback:');
                      if (fb !== null) updateStatus(v._id, 'completed', fb);
                    }} className="btn-secondary text-xs py-1" type="button">Complete</button>
                    <button onClick={() => updateStatus(v._id, 'no_show')} className="btn-secondary text-xs py-1" type="button">No-show</button>
                  </>
                )}
                <button onClick={() => openEdit(v)} className="btn-secondary text-xs py-1" type="button">Edit</button>
                <button onClick={() => handleDelete(v._id)} className="btn-secondary text-xs py-1 text-red-700" type="button">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} onPageChange={setPage} />
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editId ? 'Edit Site Visit' : 'Schedule Site Visit'}>
        <form onSubmit={handleCreate} className="space-y-4">
          <ErrorBanner message={error} />
          <div>
            <label className="label">Lead</label>
            <select className="input" value={form.lead} onChange={(e) => setForm({ ...form, lead: e.target.value })} required>
              <option value="">Select lead</option>
              {leads.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Project</label>
            <select className="input" value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} required>
              <option value="">Select project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date & Time</label>
            <input
              className="input"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              required
            />
            <p className="text-xs text-slate-500 mt-1">Date aur time dono select karein</p>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Saving...' : editId ? 'Save Changes' : 'Schedule'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
