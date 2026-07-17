import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';
import api from '../services/api';
import { Modal, Pagination, formatCurrency, paginate } from '../components/ui';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', city: '', totalUnits: '', amenities: '' });
  const [editId, setEditId] = useState('');
  const [page, setPage] = useState(1);

  const load = () => api.get('/projects').then((res) => setProjects(res.data));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      totalUnits: Number(form.totalUnits) || 0,
      amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean),
    };
    if (editId) await api.put(`/projects/${editId}`, payload);
    else await api.post('/projects', payload);
    setShowModal(false);
    setEditId('');
    setForm({ name: '', location: '', city: '', totalUnits: '', amenities: '' });
    load();
  };

  const openEdit = (project) => {
    setEditId(project._id);
    setForm({
      name: project.name || '',
      location: project.location || '',
      city: project.city || '',
      totalUnits: String(project.totalUnits || ''),
      amenities: (project.amenities || []).join(', '),
    });
    setShowModal(true);
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"?`)) return;
    await api.delete(`/projects/${project._id}`);
    load();
  };

  const paged = useMemo(() => paginate(projects, page, 8), [projects, page]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Projects</h1>
          <p className="text-slate-500 text-sm">Manage projects and inventory</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Add Project
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paged.items.map((p) => (
          <div key={p._id} className="card p-5 group">
            <div className="flex items-start gap-3">
              <Link to={`/projects/${p._id}`} className="p-3 bg-brand-50 text-brand-600 rounded-xl group-hover:bg-brand-100">
                <Building2 size={24} />
              </Link>
              <div className="flex-1">
                <Link to={`/projects/${p._id}`} className="font-display font-semibold hover:underline">{p.name}</Link>
                <p className="text-sm text-slate-500 mt-1">{p.location}</p>
                <p className="text-xs text-slate-400 mt-2">{p.totalUnits} units • {p.status?.replace(/_/g, ' ')}</p>
                {p.priceList?.[0] && (
                  <p className="text-sm font-medium text-brand-600 mt-2">From {formatCurrency(p.priceList[0].price)}</p>
                )}
                <div className="mt-3 flex items-center gap-3">
                  <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => openEdit(p)}>Edit</button>
                  <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => handleDelete(p)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card overflow-hidden">
        <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} onPageChange={setPage} />
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditId(''); }} title={editId ? 'Edit Project' : 'Add Project'}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Project Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <label className="label">Total Units</label>
            <input className="input" type="number" value={form.totalUnits} onChange={(e) => setForm({ ...form, totalUnits: e.target.value })} />
          </div>
          <div>
            <label className="label">Amenities (comma separated)</label>
            <input className="input" value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} placeholder="Pool, Gym, Club House" />
          </div>
          <button type="submit" className="btn-primary w-full">{editId ? 'Save Changes' : 'Create Project'}</button>
        </form>
      </Modal>
    </div>
  );
}
