import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, UserPlus, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { ErrorBanner } from '../components/ui';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/admin/stats')
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="animate-pulse h-48 card" />;
  }

  const cards = [
    { label: 'Total Companies', value: stats?.totalCompanies ?? 0, icon: Building2, color: 'bg-blue-50 text-blue-700' },
    { label: 'Active Companies', value: stats?.activeCompanies ?? 0, icon: CheckCircle, color: 'bg-green-50 text-green-700' },
    { label: 'Company Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'bg-violet-50 text-violet-700' },
    { label: 'Total Leads', value: stats?.totalLeads ?? 0, icon: UserPlus, color: 'bg-amber-50 text-amber-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Platform Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">AVR Growth OS — Super Admin overview</p>
        </div>
        <Link to="/admin/companies" className="btn-primary">
          <Building2 size={16} /> Manage Companies
        </Link>
      </div>

      <ErrorBanner message={error} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="font-display text-3xl font-bold mt-1">{value}</p>
              </div>
              <div className={`p-3 rounded-xl ${color}`}>
                <Icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
