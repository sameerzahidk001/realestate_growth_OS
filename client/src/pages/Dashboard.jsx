import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, MapPin, FileCheck, Phone, AlertTriangle, TrendingUp } from 'lucide-react';
import api from '../services/api';
import { formatDateTime } from '../components/ui';

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-3xl font-display font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [dueFollowUps, setDueFollowUps] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/dashboard'), api.get('/follow-ups/due')]).then(([dash, due]) => {
      setData(dash.data);
      setDueFollowUps(due.data);
    });
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Your sales command center</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Leads" value={data.totalLeads} color="bg-blue-50 text-blue-600" />
        <StatCard icon={UserPlus} label="New Today" value={data.newLeadsToday} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={MapPin} label="Site Visits Scheduled" value={data.siteVisitsScheduled} color="bg-violet-50 text-violet-600" />
        <StatCard icon={FileCheck} label="Bookings This Month" value={data.bookingsThisMonth} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="text-red-500" size={20} />
            <h2 className="font-display font-semibold">Due Follow-ups ({data.dueFollowUps})</h2>
          </div>
          {dueFollowUps.length === 0 ? (
            <p className="text-slate-500 text-sm">No overdue follow-ups. Great job!</p>
          ) : (
            <ul className="space-y-3">
              {dueFollowUps.slice(0, 5).map((f) => (
                <li key={f._id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <Link to={`/leads/${f.lead?._id}`} className="font-medium text-brand-600 hover:underline">
                      {f.lead?.name}
                    </Link>
                    <p className="text-xs text-slate-500">{formatDateTime(f.scheduledAt)}</p>
                  </div>
                  <span className="badge bg-red-100 text-red-700">Overdue</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/follow-ups" className="text-sm text-brand-600 font-medium mt-4 inline-block hover:underline">
            View all follow-ups →
          </Link>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-amber-500" size={20} />
            <h2 className="font-display font-semibold">AI Alerts</h2>
          </div>
          {data.aiAlerts?.length === 0 ? (
            <p className="text-slate-500 text-sm">No active AI alerts</p>
          ) : (
            <ul className="space-y-3">
              {data.aiAlerts?.slice(0, 5).map((alert) => (
                <li key={alert._id} className="p-3 bg-amber-50 rounded-lg text-sm">
                  <p className="font-medium text-amber-900">{alert.message}</p>
                  {alert.lead && (
                    <Link to={`/leads/${alert.lead._id}`} className="text-xs text-brand-600 hover:underline">
                      View lead →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link to="/ai" className="text-sm text-brand-600 font-medium mt-4 inline-block hover:underline">
            Open AI Hub →
          </Link>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-brand-600" size={20} />
          <h2 className="font-display font-semibold">Executive Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="pb-3 font-medium">Executive</th>
                <th className="pb-3 font-medium">Leads</th>
                <th className="pb-3 font-medium">Converted</th>
                <th className="pb-3 font-medium">Rate</th>
                <th className="pb-3 font-medium">Visits</th>
              </tr>
            </thead>
            <tbody>
              {data.executivePerformance?.map((exec) => (
                <tr key={exec.id} className="border-b border-slate-50">
                  <td className="py-3 font-medium">{exec.name}</td>
                  <td className="py-3">{exec.leadsAssigned}</td>
                  <td className="py-3">{exec.leadsConverted}</td>
                  <td className="py-3">
                    <span className="badge bg-brand-100 text-brand-800">{exec.conversionRate}%</span>
                  </td>
                  <td className="py-3">{exec.siteVisitsCompleted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
