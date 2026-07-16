import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('owner@skyline.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message;
      const hint = err.response?.data?.hint;
      if (!err.response) {
        setError('Server timeout / unreachable. Wait for Vercel redeploy to finish, then try again.');
      } else {
        setError(hint ? `${msg} (${hint})` : msg || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-brand-950 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80')] bg-cover bg-center opacity-30" />
        <div className="relative z-10 flex flex-col justify-center p-16 text-white">
          <h1 className="font-display text-5xl font-bold mb-4">
            Growth<span className="text-accent-400">OS</span>
          </h1>
          <p className="text-xl text-brand-200 max-w-md leading-relaxed">
            India's First AI Sales Operating System for Real Estate Developers
          </p>
          <p className="mt-8 text-brand-300 text-sm">
            Lead → Follow-up → Pipeline → Booking — all in one platform
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to your builder dashboard</p>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New builder?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              Create account
            </Link>
          </p>

          <div className="mt-8 p-4 bg-slate-50 rounded-lg text-xs text-slate-500">
            <p className="font-medium text-slate-700 mb-1">Demo credentials (after seed):</p>
            <p>owner@skyline.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
