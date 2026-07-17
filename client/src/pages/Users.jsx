import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';
import { Modal, Pagination, paginate } from '../components/ui';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'sales_executive' });
  const [editId, setEditId] = useState('');
  const [page, setPage] = useState(1);

  const load = () => api.get('/users').then((res) => setUsers(res.data));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (editId) await api.put(`/users/${editId}`, form);
    else await api.post('/users', form);
    setShowModal(false);
    setEditId('');
    setForm({ name: '', email: '', password: '', phone: '', role: 'sales_executive' });
    load();
  };

  const openEdit = (u) => {
    setEditId(u._id);
    setForm({ name: u.name || '', email: u.email || '', password: '', phone: u.phone || '', role: u.role || 'sales_executive' });
    setShowModal(true);
  };

  const deactivate = async (u) => {
    if (!window.confirm(`Deactivate user "${u.name}"?`)) return;
    await api.delete(`/users/${u._id}`);
    load();
  };

  const paged = useMemo(() => paginate(users, page, 10), [users, page]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Team</h1>
          <p className="text-slate-500 text-sm">Manage users and roles</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Phone</th>
              <th className="text-left p-4">Role</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.items.map((u) => (
              <tr key={u._id} className="border-t">
                <td className="p-4 font-medium">{u.name}</td>
                <td className="p-4">{u.email}</td>
                <td className="p-4">{u.phone || '—'}</td>
                <td className="p-4 capitalize">{u.role?.replace(/_/g, ' ')}</td>
                <td className="p-4">
                  <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => openEdit(u)}>Edit</button>
                    <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => deactivate(u)}>Deactivate</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} onPageChange={setPage} />
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditId(''); }} title={editId ? 'Edit Team Member' : 'Add Team Member'}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Password {editId ? '(optional)' : ''}</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editId} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="sales_executive">Sales Executive</option>
              <option value="sales_manager">Sales Manager</option>
              <option value="owner">Owner / Admin</option>
            </select>
          </div>
          <button type="submit" className="btn-primary w-full">{editId ? 'Save Changes' : 'Add User'}</button>
        </form>
      </Modal>
    </div>
  );
}
