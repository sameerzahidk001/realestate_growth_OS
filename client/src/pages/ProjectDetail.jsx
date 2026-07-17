import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import api from '../services/api';
import { Modal, Pagination, formatCurrency, paginate, ErrorBanner } from '../components/ui';

const STATUS_COLORS = {
  available: 'bg-green-100 text-green-800',
  held: 'bg-amber-100 text-amber-800',
  sold: 'bg-slate-100 text-slate-600',
  blocked: 'bg-red-100 text-red-800',
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    return value.slice(1, -1).split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ unitNumber: '', type: '2BHK', floor: '', area: '', price: '' });
  const [editUnitId, setEditUnitId] = useState('');
  const [page, setPage] = useState(1);
  const [unitError, setUnitError] = useState('');
  const [savingUnit, setSavingUnit] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [projectRes, unitsRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/units`),
      ]);
      setProject(projectRes.data);
      setUnits(unitsRes.data || []);
    } catch (err) {
      setProject(null);
      setUnits([]);
      setError(err.response?.data?.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    setUnitError('');
    setSavingUnit(true);
    const payload = {
      ...form,
      project: id,
      floor: Number(form.floor) || undefined,
      price: Number(form.price),
    };
    try {
      if (editUnitId) await api.put(`/projects/units/${editUnitId}`, payload);
      else await api.post(`/projects/${id}/units`, payload);
      setShowModal(false);
      setEditUnitId('');
      setForm({ unitNumber: '', type: '2BHK', floor: '', area: '', price: '' });
      load();
    } catch (err) {
      setUnitError(err.response?.data?.message || 'Failed to save unit');
    } finally {
      setSavingUnit(false);
    }
  };

  const openEditUnit = (u) => {
    setEditUnitId(u._id);
    setUnitError('');
    setForm({
      unitNumber: u.unitNumber || '',
      type: u.type || '2BHK',
      floor: String(u.floor || ''),
      area: u.area || '',
      price: String(u.price || ''),
    });
    setShowModal(true);
  };

  const deleteUnit = async (u) => {
    if (!window.confirm(`Delete unit ${u.unitNumber}?`)) return;
    setUnitError('');
    try {
      await api.delete(`/projects/units/${u._id}`);
      load();
    } catch (err) {
      setUnitError(err.response?.data?.message || 'Failed to delete unit');
    }
  };

  const paged = useMemo(() => paginate(units, page, 10), [units, page]);

  if (loading) {
    return <div className="animate-pulse h-64 card" />;
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600">
          <ArrowLeft size={16} /> Back to projects
        </Link>
        <div className="card p-6">
          <p className="text-red-600">{error || 'Project not found'}</p>
          <button type="button" onClick={load} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const amenities = asArray(project.amenities);

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back to projects
      </Link>

      <div className="card p-6">
        <h1 className="font-display text-2xl font-bold">{project.name}</h1>
        <p className="text-slate-500 mt-1">{project.location} • {project.city}</p>
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {amenities.map((a) => (
              <span key={a} className="badge bg-brand-50 text-brand-700">{a}</span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <h2 className="font-display font-semibold text-lg">Units ({paged.total})</h2>
        <button onClick={() => { setUnitError(''); setShowModal(true); }} className="btn-primary text-sm" type="button">
          <Plus size={16} /> Add Unit
        </button>
      </div>

      <ErrorBanner message={unitError && !showModal ? unitError : ''} />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-4">Unit</th>
              <th className="text-left p-4">Type</th>
              <th className="text-left p-4">Floor</th>
              <th className="text-left p-4">Area</th>
              <th className="text-left p-4">Price</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">No units yet</td>
              </tr>
            ) : (
              paged.items.map((u) => (
                <tr key={u._id} className="border-t">
                  <td className="p-4 font-medium">{u.unitNumber}</td>
                  <td className="p-4">{u.type}</td>
                  <td className="p-4">{u.floor || '—'}</td>
                  <td className="p-4">{u.area || '—'}</td>
                  <td className="p-4">{formatCurrency(u.price)}</td>
                  <td className="p-4">
                    <span className={`badge ${STATUS_COLORS[u.status] || 'bg-slate-100 text-slate-600'}`}>{u.status}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => openEditUnit(u)}>Edit</button>
                      <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => deleteUnit(u)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} onPageChange={setPage} />
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditUnitId(''); setUnitError(''); }} title={editUnitId ? 'Edit Unit' : 'Add Unit'}>
        <form onSubmit={handleCreateUnit} className="space-y-4">
          <ErrorBanner message={unitError} />
          <div>
            <label className="label">Unit Number</label>
            <input className="input" value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} required />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['1BHK', '2BHK', '3BHK', '4BHK', 'Penthouse', 'Villa', 'Plot'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Floor</label>
              <input className="input" type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
            </div>
            <div>
              <label className="label">Area</label>
              <input className="input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="1050 sqft" />
            </div>
          </div>
          <div>
            <label className="label">Price (₹)</label>
            <input className="input" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={savingUnit}>
            {savingUnit ? 'Saving...' : editUnitId ? 'Save Changes' : 'Add Unit'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
