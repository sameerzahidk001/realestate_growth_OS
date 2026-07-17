import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const homeForRole = (role) => {
  if (role === 'super_admin') return '/admin';
  if (role === 'customer') return '/customer';
  return '/';
};

export default function Login() {
  const [email, setEmail] = useState('owner@skyline.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const data = await login(email, password);
      navigate(homeForRole(data.user?.role));
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

  const resetDemoLogin = async () => {
    setError('');
    setInfo('');
    setResetting(true);
    try {
      const { data } = await api.post('/auth/reset-demo');
      setInfo(data.message || 'Demo accounts ready. Sign in dabao.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset demo login');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative bg-brand-950 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80')] bg-cover bg-center opacity-30" />
        <div className="relative z-10 flex flex-col justify-center p-16 text-white">
          <h1 className="font-display text-5xl font-bold mb-4">
            AVR Growth<span className="text-accent-400">OS</span>
          </h1>
          <p className="text-xl text-brand-200 max-w-md leading-relaxed">
            India's First AI Sales Operating System for Real Estate Developers
          </p>
          <p className="mt-8 text-brand-300 text-sm">
            Super Admin Panel + Company Panel — all in one platform
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-2">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to AVR Growth OS</p>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          {info && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{info}</div>}

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
            New builder company?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">
              Create account
            </Link>
          </p>

          <div className="mt-8 p-4 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-3">
            <div>
              <p className="font-medium text-slate-700 mb-1">Super Admin (platform):</p>
              <p>superadmin@avrgrowthos.com / password123</p>
            </div>
            <div>
              <p className="font-medium text-slate-700 mb-1">Company Owner (Skyline):</p>
              <p>owner@skyline.com / password123</p>
            </div>
            <button
              type="button"
              onClick={resetDemoLogin}
              disabled={resetting}
              className="btn-secondary w-full text-xs py-2"
            >
              {resetting ? 'Resetting...' : 'Reset demo passwords'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
