import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  Phone,
  MapPin,
  Building2,
  FileText,
  Sparkles,
  Megaphone,
  Globe,
  BarChart3,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ClipboardCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', phase: 1 },
  { to: '/leads', icon: Users, label: 'Leads', phase: 1 },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline', phase: 1 },
  { to: '/follow-ups', icon: Phone, label: 'Follow-ups', phase: 1 },
  { to: '/site-visits', icon: MapPin, label: 'Site Visits', phase: 1 },
  { to: '/projects', icon: Building2, label: 'Projects', phase: 1 },
  { to: '/bookings', icon: FileText, label: 'Bookings', phase: 7 },
  { to: '/ai', icon: Sparkles, label: 'AI Hub', phase: 3 },
  { to: '/marketing', icon: Megaphone, label: 'Marketing', phase: 5 },
  { to: '/landing-pages', icon: Globe, label: 'Landing Pages', phase: 5 },
  { to: '/reports', icon: BarChart3, label: 'Reports', phase: 1 },
  { to: '/pilot', icon: ClipboardCheck, label: 'Pilot Feedback', phase: 2 },
];

const demoPhase = Number(import.meta.env.VITE_DEMO_PHASE) || 0;
const visibleNavItems = demoPhase > 0 ? navItems.filter((item) => item.phase <= demoPhase) : navItems;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-brand-50/30 to-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-brand-950 text-white transform transition-transform lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-white/10">
          <h1 className="font-display text-xl font-bold tracking-tight">
            Growth<span className="text-accent-400">OS</span>
          </h1>
          <p className="text-xs text-brand-300 mt-1 leading-snug">
            AI Sales OS for Real Estate Developers
          </p>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
          {visibleNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          {['owner', 'sales_manager'].includes(user?.role) && (
            <NavLink
              to="/users"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-brand-200 hover:bg-white/10'
                }`
              }
            >
              <Users size={18} />
              Team
            </NavLink>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-brand-300 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-brand-200 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <span className="font-display font-bold text-brand-700">GrowthOS</span>
          <button onClick={() => setSidebarOpen(false)} className="invisible">
            <X size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
