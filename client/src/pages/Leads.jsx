import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload, Search, Sparkles } from 'lucide-react';
import api from '../services/api';
import { StatusBadge, ScoreBadge, formatSource, Modal, paginate, Pagination, ErrorBanner } from '../components/ui';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', source: 'manual', assignedTo: '' });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', name: '', phone: '', email: '', source: 'manual', assignedTo: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const loadLeads = () => {
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.get('/leads', { params }).then((res) => setLeads(res.data));
  };

  useEffect(() => {
    loadLeads();
    api.get('/users').then((res) => setUsers(res.data)).catch(() => {});
  }, [search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, leads.length]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.post('/leads', form);
      setShowModal(false);
      setForm({ name: '', phone: '', email: '', source: 'manual', assignedTo: '' });
      loadLeads();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create lead. Try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post('/leads/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      loadLeads();
    } finally {
      setImporting(false);
    }
  };

  const handleQualify = async (id) => {
    await api.post(`/leads/${id}/ai-qualify`);
    loadLeads();
  };

  const openEdit = (lead) => {
    setError('');
    setEditForm({
      id: lead._id,
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      source: lead.source || 'manual',
      assignedTo: lead.assignedTo?._id || '',
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError('');
    setSavingEdit(true);
    try {
      await api.put(`/leads/${editForm.id}`, editForm);
      setShowEditModal(false);
      loadLeads();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update lead');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (lead) => {
    if (!window.confirm(`Delete lead "${lead.name}"?`)) return;
    setError('');
    try {
      await api.delete(`/leads/${lead._id}`);
      loadLeads();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete lead');
    }
  };

  const paged = useMemo(() => paginate(leads, page, 10), [leads, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Leads</h1>
          <p className="text-slate-500 text-sm mt-1">{paged.total} leads</p>
        </div>
        <div className="flex gap-2">
          <label className="btn-secondary cursor-pointer">
            <Upload size={16} />
            {importing ? 'Importing...' : 'Import CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} />
            Add Lead
          </button>
        </div>
      </div>

      <ErrorBanner message={error && !showModal && !showEditModal ? error : ''} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="input pl-10"
            placeholder="Search name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['new', 'contacted', 'interested', 'site_visit_done', 'negotiation', 'booked', 'lost'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Phone</th>
                <th className="text-left p-4 font-medium">Source</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">AI Score</th>
                <th className="text-left p-4 font-medium">Assigned</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.items.map((lead) => (
                <tr key={lead._id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-4">
                    <Link to={`/leads/${lead._id}`} className="font-medium text-brand-600 hover:underline">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="p-4">{lead.phone}</td>
                  <td className="p-4">{formatSource(lead.source)}</td>
                  <td className="p-4"><StatusBadge status={lead.status} /></td>
                  <td className="p-4"><ScoreBadge score={lead.aiScore} /></td>
                  <td className="p-4">{lead.assignedTo?.name || '—'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {!lead.aiQualified && (
                        <button onClick={() => handleQualify(lead._id)} className="text-xs text-violet-600 hover:underline flex items-center gap-1">
                          <Sparkles size={12} /> Qualify
                        </button>
                      )}
                      <button onClick={() => openEdit(lead)} className="text-xs text-blue-600 hover:underline" type="button">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(lead)} className="text-xs text-red-600 hover:underline" type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} onPageChange={setPage} />
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Lead">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Source</label>
            <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {['manual', 'walk_in', 'website', 'facebook', 'google', 'referral', 'whatsapp', 'magicbricks', '99acres', 'housing'].map((s) => (
                <option key={s} value={s}>{formatSource(s)}</option>
              ))}
            </select>
          </div>
          {users.length > 0 && (
            <div>
              <label className="label">Assign to</label>
              <select className="input" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
                <option value="">Auto assign</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={creating}>
            {creating ? 'Creating...' : 'Create Lead'}
          </button>
        </form>
      </Modal>

      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Lead">
        <form onSubmit={handleEdit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="label">Name</label>
            <input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Source</label>
            <select className="input" value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}>
              {['manual', 'walk_in', 'website', 'facebook', 'google', 'referral', 'whatsapp', 'magicbricks', '99acres', 'housing'].map((s) => (
                <option key={s} value={s}>{formatSource(s)}</option>
              ))}
            </select>
          </div>
          {users.length > 0 && (
            <div>
              <label className="label">Assign to</label>
              <select className="input" value={editForm.assignedTo} onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value })}>
                <option value="">Auto assign</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="btn-primary w-full" disabled={savingEdit}>
            {savingEdit ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
