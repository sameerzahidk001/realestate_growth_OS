import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

export default function PublicLanding() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get(`/marketing/landing/${slug}`).then((res) => setPage(res.data)).catch(() => {});
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post(`/marketing/landing/${slug}/capture`, form);
    setSubmitted(true);
  };

  if (!page) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const hero = page.blocks?.find((b) => b.type === 'hero');

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950 text-white">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&q=80')] bg-cover bg-center opacity-20" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-accent-400 font-medium mb-4">GrowthOS Landing</p>
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
          {hero?.content?.headline || page.title}
        </h1>
        <p className="text-xl text-brand-200 mb-12 max-w-2xl mx-auto">
          {hero?.content?.subtext || page.project?.location || 'Register your interest today'}
        </p>

        {submitted ? (
          <div className="card max-w-md mx-auto p-8 text-slate-800">
            <h2 className="text-2xl font-bold text-green-600 mb-2">Thank you!</h2>
            <p>Our team will contact you shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card max-w-md mx-auto p-8 text-left space-y-4">
            <h2 className="font-display text-xl font-semibold text-slate-900 text-center mb-2">Enquire Now</h2>
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <button type="submit" className="btn-accent w-full py-3">Submit Enquiry</button>
          </form>
        )}
      </div>
    </div>
  );
}
