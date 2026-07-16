import { useEffect, useState } from 'react';
import { Plus, Globe } from 'lucide-react';
import api from '../services/api';
import { Modal } from '../components/ui';

export default function LandingPageBuilder() {
  const [pages, setPages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    blocks: [
      { type: 'hero', content: { headline: 'Your Dream Home Awaits', subtext: 'Premium apartments in prime location' }, order: 0 },
      { type: 'form', content: { fields: ['name', 'phone', 'email'] }, order: 1 },
    ],
  });

  const load = () => api.get('/marketing/landing-pages').then((res) => setPages(res.data));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/marketing/landing-pages', { ...form, isPublished: true });
    setShowModal(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-2xl font-bold">Landing Pages</h1>
          <p className="text-slate-500 text-sm">Phase 5 — Drag & drop lead capture pages</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={16} /> Create Page
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {pages.map((p) => (
          <div key={p._id} className="card p-5">
            <div className="flex items-start gap-3">
              <Globe className="text-brand-600 mt-1" size={20} />
              <div>
                <h3 className="font-semibold">{p.title}</h3>
                <a href={`/lp/${p.slug}`} target="_blank" rel="noreferrer" className="text-sm text-brand-600 hover:underline">
                  /lp/{p.slug}
                </a>
                <p className="text-xs text-slate-500 mt-2">{p.leadsCaptured} leads captured • {p.isPublished ? 'Published' : 'Draft'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Landing Page" wide>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Page Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} required />
          </div>
          <div>
            <label className="label">URL Slug</label>
            <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
          </div>
          <div>
            <label className="label">Hero Headline</label>
            <input
              className="input"
              value={form.blocks[0].content.headline}
              onChange={(e) => {
                const blocks = [...form.blocks];
                blocks[0] = { ...blocks[0], content: { ...blocks[0].content, headline: e.target.value } };
                setForm({ ...form, blocks });
              }}
            />
          </div>
          <button type="submit" className="btn-primary w-full">Publish Page</button>
        </form>
      </Modal>
    </div>
  );
}
