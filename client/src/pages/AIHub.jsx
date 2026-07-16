import { useEffect, useState } from 'react';
import { Sparkles, MessageSquare, FileText, Mic, TrendingUp, Target, MapPin, Search } from 'lucide-react';
import api from '../services/api';

const AIFeature = ({ icon: Icon, title, description, children }) => (
  <div className="card p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="font-display font-semibold">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
    {children}
  </div>
);

export default function AIHub() {
  const [alerts, setAlerts] = useState([]);
  const [assistantQ, setAssistantQ] = useState('');
  const [assistantA, setAssistantA] = useState('');
  const [analyticsQ, setAnalyticsQ] = useState('');
  const [analyticsA, setAnalyticsA] = useState('');
  const [marketInsight, setMarketInsight] = useState('');
  const [callTranscript, setCallTranscript] = useState('');
  const [callSummary, setCallSummary] = useState('');
  const [negotiation, setNegotiation] = useState('');
  const [voiceQ, setVoiceQ] = useState('');
  const [voiceA, setVoiceA] = useState('');
  const [leadHunterResult, setLeadHunterResult] = useState(null);
  const [loading, setLoading] = useState('');

  useEffect(() => {
    api.get('/ai/alerts').then((res) => setAlerts(res.data));
  }, []);

  const run = async (key, fn) => {
    setLoading(key);
    try {
      await fn();
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Sparkles className="text-violet-500" /> AI Hub
        </h1>
        <p className="text-slate-500 text-sm mt-1">Phase 3-4 & 8 AI features — qualification, scoring, assistant, analytics</p>
      </div>

      {alerts.length > 0 && (
        <div className="card p-5 border-l-4 border-amber-400">
          <h2 className="font-semibold mb-3">AI Follow-up Alerts</h2>
          <ul className="space-y-2">
            {alerts.slice(0, 5).map((a) => (
              <li key={a._id} className="text-sm p-2 bg-amber-50 rounded">{a.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <AIFeature icon={MessageSquare} title="AI Sales Assistant" description="Ask who to call next">
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Who should I follow up with next?"
              value={assistantQ}
              onChange={(e) => setAssistantQ(e.target.value)}
            />
            <button
              className="btn-primary w-full"
              disabled={loading === 'assistant'}
              onClick={() => run('assistant', async () => {
                const { data } = await api.post('/ai/assistant', { question: assistantQ });
                setAssistantA(data.answer);
              })}
            >
              {loading === 'assistant' ? 'Thinking...' : 'Ask AI'}
            </button>
            {assistantA && <p className="text-sm p-3 bg-violet-50 rounded-lg">{assistantA}</p>}
          </div>
        </AIFeature>

        <AIFeature icon={TrendingUp} title="AI Analytics" description="Natural language data queries">
          <div className="space-y-3">
            <input
              className="input"
              placeholder="Why are sales down this month?"
              value={analyticsQ}
              onChange={(e) => setAnalyticsQ(e.target.value)}
            />
            <button
              className="btn-primary w-full"
              disabled={loading === 'analytics'}
              onClick={() => run('analytics', async () => {
                const { data } = await api.post('/ai/analytics', { question: analyticsQ });
                setAnalyticsA(data.answer);
              })}
            >
              Analyze
            </button>
            {analyticsA && <p className="text-sm p-3 bg-violet-50 rounded-lg">{analyticsA}</p>}
          </div>
        </AIFeature>

        <AIFeature icon={Mic} title="AI Call Summary" description="Transcribe & summarize calls">
          <textarea
            className="input"
            rows={3}
            placeholder="Paste call transcript..."
            value={callTranscript}
            onChange={(e) => setCallTranscript(e.target.value)}
          />
          <button
            className="btn-primary w-full mt-3"
            disabled={loading === 'call'}
            onClick={() => run('call', async () => {
              const { data } = await api.post('/ai/call-summary', { transcript: callTranscript });
              setCallSummary(data.summary);
            })}
          >
            Summarize
          </button>
          {callSummary && <p className="text-sm p-3 bg-violet-50 rounded-lg mt-3">{callSummary}</p>}
        </AIFeature>

        <AIFeature icon={Target} title="AI Negotiation Assistant" description="Alternatives to discounting">
          <input
            className="input"
            placeholder="Customer wants 5% discount..."
            value={negotiation}
            onChange={(e) => setNegotiation(e.target.value)}
          />
          <button
            className="btn-primary w-full mt-3"
            disabled={loading === 'negotiation'}
            onClick={() => run('negotiation', async () => {
              const { data } = await api.post('/ai/negotiation', { requestedDiscount: 5 });
              setNegotiation(data.suggestion);
            })}
          >
            Get Suggestion
          </button>
        </AIFeature>

        <AIFeature icon={Mic} title="AI Voice Bot" description="Answer common customer questions">
          <input className="input" placeholder="What's the price for 3BHK?" value={voiceQ} onChange={(e) => setVoiceQ(e.target.value)} />
          <button
            className="btn-primary w-full mt-3"
            onClick={() => run('voice', async () => {
              const { data } = await api.post('/ai/voice-bot', { question: voiceQ });
              setVoiceA(data.answer);
            })}
          >
            Ask Bot
          </button>
          {voiceA && <p className="text-sm p-3 bg-violet-50 rounded-lg mt-3">{voiceA}</p>}
        </AIFeature>

        <AIFeature icon={MapPin} title="AI Market Intelligence" description="Area-wise demand trends">
          <button
            className="btn-primary w-full"
            onClick={() => run('market', async () => {
              const { data } = await api.get('/ai/market?city=Patna&bhk=2BHK');
              setMarketInsight(data.insight);
            })}
          >
            Get Patna 2BHK Insights
          </button>
          {marketInsight && <p className="text-sm p-3 bg-violet-50 rounded-lg mt-3">{marketInsight}</p>}
        </AIFeature>

        <AIFeature icon={Search} title="AI Lead Hunter" description="Campaign suggestions for new leads">
          <button
            className="btn-primary w-full"
            onClick={() => run('hunter', async () => {
              const { data } = await api.post('/ai/lead-hunter', { city: 'Patna', budget: '40-70L', count: 100 });
              setLeadHunterResult(data.campaign);
            })}
          >
            Generate Campaign
          </button>
          {leadHunterResult && (
            <pre className="text-xs p-3 bg-violet-50 rounded-lg mt-3 overflow-auto">
              {typeof leadHunterResult === 'string' ? leadHunterResult : JSON.stringify(leadHunterResult, null, 2)}
            </pre>
          )}
        </AIFeature>

        <AIFeature icon={Sparkles} title="Recalculate AI Scores" description="Refresh all lead scores">
          <button
            className="btn-secondary w-full"
            onClick={() => run('scores', async () => {
              const { data } = await api.post('/ai/recalculate-scores');
              alert(`Updated ${data.updated} of ${data.total} leads`);
            })}
          >
            Recalculate All Scores
          </button>
        </AIFeature>
      </div>
    </div>
  );
}
