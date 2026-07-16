import { useEffect, useState } from 'react';
import { Plus, FileText, CreditCard, Key, HardHat } from 'lucide-react';
import api from '../services/api';
import { Modal, formatCurrency, formatDate } from '../components/ui';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [construction, setConstruction] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showConstruction, setShowConstruction] = useState(false);
  const [form, setForm] = useState({ leadId: '', projectId: '', unitId: '', bookingAmount: '' });
  const [constructionForm, setConstructionForm] = useState({ project: '', title: '', description: '', progressPercent: '' });

  const load = () => {
    api.get('/bookings').then((res) => setBookings(res.data));
    api.get('/bookings/referrals/all').then((res) => setReferrals(res.data));
    api.get('/bookings/construction/updates').then((res) => setConstruction(res.data));
  };

  useEffect(() => {
    load();
    api.get('/leads').then((res) => setLeads(res.data.filter((l) => ['negotiation', 'site_visit_done', 'interested'].includes(l.status))));
    api.get('/projects').then((res) => setProjects(res.data));
  }, []);

  const loadUnits = async (projectId) => {
    const { data } = await api.get(`/projects/${projectId}/units`, { params: { status: 'available' } });
    setUnits(data);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const unit = units.find((u) => u._id === form.unitId);
    await api.post('/bookings', {
      leadId: form.leadId,
      projectId: form.projectId,
      unitId: form.unitId,
      bookingAmount: Number(form.bookingAmount),
      totalPrice: unit?.price,
    });
    setShowModal(false);
    load();
  };

  const viewPayments = async (booking) => {
    setSelectedBooking(booking);
    const { data } = await api.get(`/bookings/payments/${booking._id}`);
    setPayments(data);
  };

  const downloadAgreement = async (id) => {
    const res = await api.get(`/bookings/${id}/agreement`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `agreement-${id}.pdf`;
    a.click();
  };

  const recordPayment = async (paymentId) => {
    await api.patch(`/bookings/payments/${paymentId}`, { paymentMethod: 'bank_transfer' });
    if (selectedBooking) viewPayments(selectedBooking);
  };

  const addConstruction = async (e) => {
    e.preventDefault();
    await api.post('/bookings/construction/updates', {
      ...constructionForm,
      progressPercent: Number(constructionForm.progressPercent),
    });
    setShowConstruction(false);
    load();
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Bookings & Post-Sale</h1>
          <p className="text-slate-500 text-sm">Phase 7 — Booking → Agreement → Payment → Possession → Referral</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> New Booking
        </button>
      </div>

      <div className="grid gap-4">
        {bookings.map((b) => (
          <div key={b._id} className="card p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">{b.lead?.name}</h3>
                <p className="text-sm text-slate-500">{b.project?.name} • Unit {b.unit?.unitNumber} ({b.unit?.type})</p>
                <p className="text-sm mt-1">{formatCurrency(b.totalPrice)} • Booking: {formatCurrency(b.bookingAmount)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="badge bg-brand-100 text-brand-800">{b.status?.replace(/_/g, ' ')}</span>
                <button onClick={() => viewPayments(b)} className="btn-secondary text-xs py-1">
                  <CreditCard size={14} /> Payments
                </button>
                <button onClick={() => downloadAgreement(b._id)} className="btn-secondary text-xs py-1">
                  <FileText size={14} /> Agreement
                </button>
              </div>
            </div>
          </div>
        ))}
        {bookings.length === 0 && <p className="text-slate-500 text-center py-8">No bookings yet</p>}
      </div>

      {selectedBooking && (
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Payment Schedule — {selectedBooking.lead?.name}</h3>
          <table className="w-full text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="text-left pb-2">#</th>
                <th className="text-left pb-2">Amount</th>
                <th className="text-left pb-2">Due</th>
                <th className="text-left pb-2">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-t">
                  <td className="py-2">{p.installmentNumber}</td>
                  <td className="py-2">{formatCurrency(p.amount)}</td>
                  <td className="py-2">{formatDate(p.dueDate)}</td>
                  <td className="py-2">
                    <span className={`badge ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2">
                    {p.status === 'pending' && (
                      <button onClick={() => recordPayment(p._id)} className="text-xs text-brand-600 hover:underline">Mark paid</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2"><HardHat size={18} /> Construction Updates</h3>
            <button onClick={() => setShowConstruction(true)} className="btn-secondary text-xs">Add Update</button>
          </div>
          {construction.map((u) => (
            <div key={u._id} className="py-3 border-b last:border-0">
              <p className="font-medium text-sm">{u.title}</p>
              <p className="text-xs text-slate-500">{u.project?.name} • {u.progressPercent}% complete</p>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-4"><Key size={18} /> Referral Program</h3>
          {referrals.length === 0 ? (
            <p className="text-sm text-slate-500">No referrals tracked yet</p>
          ) : (
            referrals.map((r) => (
              <div key={r._id} className="py-3 border-b last:border-0 text-sm">
                <p>{r.referrerLead?.name || r.referredName} → {r.referredLead?.name || r.referredPhone}</p>
                <span className="badge bg-slate-100 text-slate-600 mt-1">{r.status}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Booking" wide>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Lead</label>
            <select className="input" value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })} required>
              <option value="">Select lead</option>
              {leads.map((l) => <option key={l._id} value={l._id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Project</label>
            <select className="input" value={form.projectId} onChange={(e) => { setForm({ ...form, projectId: e.target.value, unitId: '' }); loadUnits(e.target.value); }} required>
              <option value="">Select project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Unit</label>
            <select className="input" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} required>
              <option value="">Select unit</option>
              {units.map((u) => <option key={u._id} value={u._id}>{u.unitNumber} — {u.type} — {formatCurrency(u.price)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Booking Amount (₹)</label>
            <input className="input" type="number" value={form.bookingAmount} onChange={(e) => setForm({ ...form, bookingAmount: e.target.value })} required />
          </div>
          <button type="submit" className="btn-primary w-full">Confirm Booking</button>
        </form>
      </Modal>

      <Modal open={showConstruction} onClose={() => setShowConstruction(false)} title="Add Construction Update">
        <form onSubmit={addConstruction} className="space-y-4">
          <div>
            <label className="label">Project</label>
            <select className="input" value={constructionForm.project} onChange={(e) => setConstructionForm({ ...constructionForm, project: e.target.value })} required>
              <option value="">Select</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" value={constructionForm.title} onChange={(e) => setConstructionForm({ ...constructionForm, title: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={constructionForm.description} onChange={(e) => setConstructionForm({ ...constructionForm, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Progress %</label>
            <input className="input" type="number" min="0" max="100" value={constructionForm.progressPercent} onChange={(e) => setConstructionForm({ ...constructionForm, progressPercent: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary w-full">Publish Update</button>
        </form>
      </Modal>
    </div>
  );
}
