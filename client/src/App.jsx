import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Pipeline from './pages/Pipeline';
import FollowUps from './pages/FollowUps';
import SiteVisits from './pages/SiteVisits';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Users from './pages/Users';
import Reports from './pages/Reports';
import AIHub from './pages/AIHub';
import Bookings from './pages/Bookings';
import Marketing from './pages/Marketing';
import PilotFeedback from './pages/PilotFeedback';
import CustomerPortal from './pages/CustomerPortal';
import LandingPageBuilder from './pages/LandingPageBuilder';
import PublicLanding from './pages/PublicLanding';
import AdminDashboard from './pages/AdminDashboard';
import AdminCompanies from './pages/AdminCompanies';

const homeForRole = (role) => {
  if (role === 'super_admin') return '/admin';
  if (role === 'customer') return '/customer';
  return '/';
};

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }
  return children;
};

export default function App() {
  const { user } = useAuth();

  if (user?.role === 'customer') {
    return (
      <Routes>
        <Route path="/customer/*" element={<CustomerPortal />} />
        <Route path="*" element={<Navigate to="/customer" replace />} />
      </Routes>
    );
  }

  if (user?.role === 'super_admin') {
    return (
      <Routes>
        <Route path="/login" element={<Navigate to="/admin" replace />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="companies" element={<AdminCompanies />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={homeForRole(user.role)} replace /> : <Login />}
      />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/lp/:slug" element={<PublicLanding />} />
      <Route path="/admin/*" element={<Navigate to="/" replace />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="follow-ups" element={<FollowUps />} />
        <Route path="site-visits" element={<SiteVisits />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="ai" element={<AIHub />} />
        <Route path="marketing" element={<Marketing />} />
        <Route path="landing-pages" element={<LandingPageBuilder />} />
        <Route path="reports" element={<Reports />} />
        <Route path="pilot" element={<PilotFeedback />} />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={['owner', 'sales_manager']}>
              <Users />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
