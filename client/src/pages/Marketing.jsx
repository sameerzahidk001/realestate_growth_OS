import { useEffect, useState } from 'react';
import { Plus, Sparkles, Import } from 'lucide-react';
import api from '../services/api';
import { Modal } from '../components/ui';

export default function Marketing() {
  const [campaigns, setCampaigns] = useState([]);
  const [automation, setAutomation] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [showCampaign, setShowCampaign] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [campaignForm, setCampaignForm] = useState({ name: '', platform: 'facebook', budget: '' });
  const [automationForm, setAutomationForm] = useState({ name: '', type: 'segment', channels: ['whatsapp'], generateWithAi: true });

  const load = () => {
    api.get('/marketing/campaigns').then((res) => setCampaigns(res.data));
    api.get('/marketing/automation').then((res) => setAutomation(res.data));
    api.get('/marketing/competitors').then((res) => setCompetitors(res.data));
  };

  useEffect(() => { load(); }, []);

  const createCampaign = async (e) => {
    e.preventDefault();
    await api.post('/marketing/campaigns', { ...campaignForm, budget: Number(campaignForm.budget) });
    setShowCampaign(false);
    load();
  };

  const getAiSuggestion = async () => {
    const { data } = await api.post('/marketing/campaigns/ai-suggest', {
      description: 'Create Facebook ad for 3BHK apartments in Patna, budget 40-70L',
    });
    setAiSuggestion(data);
  };

  const importLeads = async () => {
    await api.post('/marketing/import-leads', {
      portal: 'magicbricks',
      leads: [
        { name: 'Portal Lead 1', phone: '9999900001', email: 'lead1@test.com' },
        { name: 'Portal Lead 2', phone: '9999900002', email: 'lead2@test.com' },
      ],
    });
    alert('Imported 2 leads from MagicBricks');
  };

  const createAutomation = async (e) => {
    e.preventDefault();
    await api.post('/marketing/automation', automationForm);
    setShowAutomation(false);
    load();
  };

  const trackCompetitor = async () => {
    await api.post('/marketing/competitors', {
      name: 'Nearby Builder',
      location: 'Patna',
      projectName: 'New Launch Towers',
      priceRange: { min: 4500000, max: 6500000 },
      offers: ['Free parking', 'No floor rise till 5th'],
    });
    load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Marketing</h1>
        <p className="text-slate-500 text-sm">Phase 5-6 — Lead gen integrations & marketing automation</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => setShowCampaign(true)} className="btn-primary"><Plus size={16} /> New Campaign</button>
        <button onClick={getAiSuggestion} className="btn-secondary"><Sparkles size={16} /> AI Campaign Generator</button>
        <button onClick={importLeads} className="btn-secondary"><Import size={16} /> Import Portal Leads</button>
        <button onClick={() => setShowAutomation(true)} className="btn-secondary"><Plus size={16} /> Automation</button>
        <button onClick={trackCompetitor} className="btn-secondary">Track Competitor</button>
      </div>

      {aiSuggestion && (
        <div className="card p-5 border-l-4 border-violet-400">
          <h3 className="font-semibold mb-2">AI Campaign Suggestion</h3>
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(aiSuggestion, null, 2)}</pre>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Lead Gen Campaigns</h3>
          {campaigns.length === 0 ? <p className="text-sm text-slate-500">No campaigns</p> : campaigns.map((c) => (
            <div key={c._id} className="py-3 border-b text-sm">
              <p className="font-medium">{c.name}</p>
              <p className="text-slate-500">{c.platform} • {c.status} • {c.leadsGenerated} leads</p>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-4">Marketing Automation</h3>
          {automation.length === 0 ? <p className="text-sm text-slate-500">No automations</p> : automation.map((a) => (
            <div key={a._id} className="py-3 border-b text-sm">
              <p className="font-medium">{a.name}</p>
              <p className="text-slate-500">{a.type} • {a.channels?.join(', ')} • {a.status}</p>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-4">AI Competitor Tracker</h3>
          {competitors.length === 0 ? <p className="text-sm text-slate-500">No competitors tracked</p> : competitors.map((c) => (
            <div key={c._id} className="py-3 border-b text-sm">
              <p className="font-medium">{c.name} — {c.projectName}</p>
              <p className="text-slate-500">{c.location}</p>
              {c.offers?.length > 0 && <p className="text-xs mt-1">{c.offers.join(' • ')}</p>}
            </div>
          ))}
        </div>
      </div>

      <Modal open={showCampaign} onClose={() => setShowCampaign(false)} title="Create Campaign">
        <form onSubmit={createCampaign} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Platform</label>
            <select className="input" value={campaignForm.platform} onChange={(e) => setCampaignForm({ ...campaignForm, platform: e.target.value })}>
              {['facebook', 'google', 'whatsapp', 'magicbricks', '99acres', 'housing'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Budget (₹)</label>
            <input className="input" type="number" value={campaignForm.budget} onChange={(e) => setCampaignForm({ ...campaignForm, budget: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary w-full">Create</button>
        </form>
      </Modal>

      <Modal open={showAutomation} onClose={() => setShowAutomation(false)} title="Marketing Automation">
        <form onSubmit={createAutomation} className="space-y-4">
          <div>
            <label className="label">Campaign Name</label>
            <input className="input" value={automationForm.name} onChange={(e) => setAutomationForm({ ...automationForm, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={automationForm.type} onChange={(e) => setAutomationForm({ ...automationForm, type: e.target.value })}>
              {['segment', 'birthday', 'festival', 'drip', 'broadcast'].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={automationForm.generateWithAi} onChange={(e) => setAutomationForm({ ...automationForm, generateWithAi: e.target.checked })} />
            Generate content with AI
          </label>
          <button type="submit" className="btn-primary w-full">Create Automation</button>
        </form>
      </Modal>
    </div>
  );
}
