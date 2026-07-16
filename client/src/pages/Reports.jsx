import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell } from 'recharts';
import api from '../services/api';
import { formatSource } from '../components/ui';

const FUNNEL_COLORS = ['#0c87e8', '#36a6f8', '#7cc4fc', '#f59e0b', '#d97706', '#16a34a', '#ef4444'];

export default function Reports() {
  const [sourceReport, setSourceReport] = useState([]);
  const [funnelReport, setFunnelReport] = useState([]);
  const [executiveReport, setExecutiveReport] = useState([]);

  useEffect(() => {
    api.get('/dashboard/reports/source').then((res) =>
      setSourceReport(res.data.map((r) => ({ name: formatSource(r._id), count: r.count, booked: r.booked })))
    );
    api.get('/dashboard/reports/funnel').then((res) =>
      setFunnelReport(res.data.map((r) => ({ name: r.stage.replace(/_/g, ' '), value: r.count })))
    );
    api.get('/dashboard/reports/executive').then((res) => setExecutiveReport(res.data));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Lead source, funnel, and executive analytics</p>
      </div>

      <div className="card p-6">
        <h2 className="font-display font-semibold mb-4">Lead Source Report</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sourceReport}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#0c87e8" name="Total Leads" radius={[4, 4, 0, 0]} />
            <Bar dataKey="booked" fill="#16a34a" name="Booked" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="font-display font-semibold mb-4">Sales Funnel</h2>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={funnelReport} isAnimationActive>
                <LabelList position="right" fill="#334155" stroke="none" dataKey="name" />
                {funnelReport.map((_, i) => (
                  <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h2 className="font-display font-semibold mb-4">Executive Conversion</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={executiveReport} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="leadsConverted" fill="#16a34a" name="Converted" radius={[0, 4, 4, 0]} />
              <Bar dataKey="leadsAssigned" fill="#0c87e8" name="Assigned" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
