import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../components/ui';

export default function CustomerPortal() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [complaint, setComplaint] = useState({ subject: '', description: '', category: 'other' });

  useEffect(() => {
    import('../services/api').then(({ default: api }) => {
      api.get('/customer/dashboard').then((res) => setData(res.data)).catch(() => {});
    });
  }, []);

  const submitComplaint = async () => {
    const { default: api } = await import('../services/api');
    await api.post('/customer/complaints', complaint);
    setComplaint({ subject: '', description: '', category: 'other' });
    alert('Complaint submitted');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100">
      <header className="bg-brand-950 text-white p-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="font-display text-xl font-bold">AVR Growth<span className="text-accent-400">OS</span> Customer</h1>
            <p className="text-sm text-brand-300">Welcome, {user?.name}</p>
          </div>
          <button onClick={logout} className="text-sm text-brand-200 hover:text-white">Sign out</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <p className="text-sm text-slate-500">Phase 9 — Customer mobile-ready portal</p>

        {data?.booking ? (
          <>
            <div className="card p-6">
              <h2 className="font-display font-semibold text-lg mb-4">Booking Status</h2>
              <p className="font-medium">{data.booking.project?.name}</p>
              <p className="text-sm text-slate-500">Unit {data.booking.unit?.unitNumber} ({data.booking.unit?.type})</p>
              <p className="mt-2">{formatCurrency(data.booking.totalPrice)}</p>
              <span className="badge bg-green-100 text-green-700 mt-2">{data.booking.status?.replace(/_/g, ' ')}</span>
            </div>

            <div className="card p-6">
              <h2 className="font-display font-semibold text-lg mb-4">Payments & EMI</h2>
              {data.payments?.map((p) => (
                <div key={p._id} className="flex justify-between py-2 border-b text-sm">
                  <span>Installment #{p.installmentNumber}</span>
                  <span>{formatCurrency(p.amount)} — {formatDate(p.dueDate)}</span>
                  <span className={`badge ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                </div>
              ))}
            </div>

            <div className="card p-6">
              <h2 className="font-display font-semibold text-lg mb-4">Construction Updates</h2>
              {data.constructionUpdates?.length === 0 ? (
                <p className="text-sm text-slate-500">No updates yet</p>
              ) : (
                data.constructionUpdates.map((u) => (
                  <div key={u._id} className="py-3 border-b">
                    <p className="font-medium text-sm">{u.title}</p>
                    <p className="text-xs text-slate-500">{u.progressPercent}% complete</p>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="card p-8 text-center text-slate-500">
            <p>No active booking found for your account.</p>
            <p className="text-sm mt-2">Contact your builder for access.</p>
          </div>
        )}

        <div className="card p-6">
          <h2 className="font-display font-semibold text-lg mb-4">Support / Complaint</h2>
          <div className="space-y-3">
            <input className="input" placeholder="Subject" value={complaint.subject} onChange={(e) => setComplaint({ ...complaint, subject: e.target.value })} />
            <textarea className="input" rows={3} placeholder="Describe your issue" value={complaint.description} onChange={(e) => setComplaint({ ...complaint, description: e.target.value })} />
            <button onClick={submitComplaint} className="btn-primary">Submit Complaint</button>
          </div>
        </div>
      </main>
    </div>
  );
}
