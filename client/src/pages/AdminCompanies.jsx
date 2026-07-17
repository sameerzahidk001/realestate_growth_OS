import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import api from '../services/api';
import { Modal, Pagination, paginate, ErrorBanner, SuccessBanner } from '../components/ui';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  city: '',
  plan: 'pilot',
  ownerName: '',
  ownerEmail: '',
  ownerPassword: 'password123',
};

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const load = () => {
    const params = {};
    if (search) params.search = search;
    return api
      .get('/admin/companies', { params })
      .then((res) => setCompanies(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load companies'));
  };

  useEffect(() => {
    load();
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [search, companies.length]);

  useEffect(() => {
    if (!success) return undefined;
    const t = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(t);
  }, [success]);

  const resetForm = () => {
    setEditId('');
    setForm(emptyForm);
    setError('');
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditId(c._id);
    setForm({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      city: c.city || '',
      plan: c.plan || 'pilot',
      ownerName: '',
      ownerEmail: '',
      ownerPassword: 'password123',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editId) {
        await api.put(`/admin/companies/${editId}`, {
          name: form.name,
          email: form.email,
          phone: form.phone,
          city: form.city,
          plan: form.plan,
        });
        setSuccess('Company updated');
      } else {
        await api.post('/admin/companies', form);
        setSuccess('Company created with owner account');
      }
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save company');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (c) => {
    const next = !c.isActive;
    if (!window.confirm(`${next ? 'Activate' : 'Deactivate'} company "${c.name}"?`)) return;
    setError('');
    try {
      await api.patch(`/admin/companies/${c._id}/status`, { isActive: next });
      setSuccess(`Company ${next ? 'activated' : 'deactivated'}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const viewUsers = async (c) => {
    setError('');
    setSelectedCompany(c);
    try {
      const { data } = await api.get(`/admin/companies/${c._id}/users`);
      setCompanyUsers(data.users || []);
      setUsersOpen(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    }
  };

  const paged = useMemo(() => paginate(companies, page, 10), [companies, page]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Companies</h1>
          <p className="text-slate-500 text-sm mt-1">Manage builder companies on the platform</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus size={16} /> Add Company
        </button>
      </div>

      <ErrorBanner message={error && !showModal ? error : ''} />
      <SuccessBanner message={success} />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          className="input pl-10"
          placeholder="Search company name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left p-4">Company</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">City</th>
                <th className="text-left p-4">Plan</th>
                <th className="text-left p-4">Users</th>
                <th className="text-left p-4">Leads</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">No companies yet</td>
                </tr>
              ) : (
                paged.items.map((c) => (
                  <tr key={c._id} className="border-t">
                    <td className="p-4 font-medium">{c.name}</td>
                    <td className="p-4">{c.email}</td>
                    <td className="p-4">{c.city || '—'}</td>
                    <td className="p-4 capitalize">{c.plan}</td>
                    <td className="p-4">{c.userCount ?? 0}</td>
                    <td className="p-4">{c.leadCount ?? 0}</td>
                    <td className="p-4">
                      <span className={`badge ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => openEdit(c)}>
                          Edit
                        </button>
                        <button type="button" className="text-xs text-slate-600 hover:underline inline-flex items-center gap-1" onClick={() => viewUsers(c)}>
                          <Users size={12} /> Users
                        </button>
                        <button
                          type="button"
                          className={`text-xs hover:underline ${c.isActive ? 'text-red-600' : 'text-green-600'}`}
                          onClick={() => toggleStatus(c)}
                        >
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} onPageChange={setPage} />
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editId ? 'Edit Company' : 'Add Company'}>
        <form onSubmit={handleSave} className="space-y-4">
          <ErrorBanner message={error} />
          <div>
            <label className="label">Company Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Company Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Plan</label>
            <select className="input" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
              <option value="pilot">Pilot</option>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          {!editId && (
            <>
              <div className="border-t pt-3">
                <p className="text-sm font-medium text-slate-700 mb-2">Company Owner Account</p>
              </div>
              <div>
                <label className="label">Owner Name</label>
                <input className="input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} required />
              </div>
              <div>
                <label className="label">Owner Email</label>
                <input className="input" type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} required />
              </div>
              <div>
                <label className="label">Owner Password</label>
                <input className="input" type="password" value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} required />
              </div>
            </>
          )}
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Saving...' : editId ? 'Save Changes' : 'Create Company'}
          </button>
        </form>
      </Modal>

      <Modal open={usersOpen} onClose={() => setUsersOpen(false)} title={`Users — ${selectedCompany?.name || ''}`} wide>
        {companyUsers.length === 0 ? (
          <p className="text-slate-500 text-sm">No users in this company</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {companyUsers.map((u) => (
                <tr key={u._id} className="border-t">
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3 capitalize">{u.role?.replace(/_/g, ' ')}</td>
                  <td className="p-3">
                    <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
