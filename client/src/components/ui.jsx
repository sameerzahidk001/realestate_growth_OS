const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-cyan-100 text-cyan-800',
  interested: 'bg-emerald-100 text-emerald-800',
  site_visit_done: 'bg-violet-100 text-violet-800',
  negotiation: 'bg-amber-100 text-amber-800',
  booked: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

const SOURCE_LABELS = {
  walk_in: 'Walk-in',
  website: 'Website',
  facebook: 'Facebook',
  google: 'Google',
  magicbricks: 'MagicBricks',
  '99acres': '99acres',
  housing: 'Housing.com',
  referral: 'Referral',
  whatsapp: 'WhatsApp',
  landing_page: 'Landing Page',
  manual: 'Manual',
  other: 'Other',
};

export const formatStatus = (status) =>
  status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '';

export const formatSource = (source) => SOURCE_LABELS[source] || source;

export const StatusBadge = ({ status }) => (
  <span className={`badge ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-700'}`}>
    {formatStatus(status)}
  </span>
);

export const ScoreBadge = ({ score }) => {
  const color =
    score >= 80 ? 'bg-green-100 text-green-800' : score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600';
  return <span className={`badge ${color}`}>AI {score}</span>;
};

export const formatCurrency = (amount) =>
  amount ? `₹${Number(amount).toLocaleString('en-IN')}` : '—';

export const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (date) =>
  date
    ? new Date(date).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export const toDatetimeLocalValue = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const isValidDatetimeLocal = (value) => {
  if (!value || !value.includes('T')) return false;
  const [, timePart] = value.split('T');
  if (!timePart || timePart.includes('--')) return false;
  return !Number.isNaN(new Date(value).getTime());
};

export const ErrorBanner = ({ message }) =>
  message ? <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{message}</div> : null;

export const SuccessBanner = ({ message }) =>
  message ? <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">{message}</div> : null;

export const STAGES = [
  { key: 'new', label: 'New', color: 'border-blue-400' },
  { key: 'contacted', label: 'Contacted', color: 'border-cyan-400' },
  { key: 'interested', label: 'Interested', color: 'border-emerald-400' },
  { key: 'site_visit_done', label: 'Site Visit Done', color: 'border-violet-400' },
  { key: 'negotiation', label: 'Negotiation', color: 'border-amber-400' },
  { key: 'booked', label: 'Booked', color: 'border-green-400' },
  { key: 'lost', label: 'Lost', color: 'border-red-400' },
];

export const paginate = (items = [], page = 1, perPage = 10) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safePerPage = Math.max(1, Number(perPage) || 10);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safePerPage));
  const current = Math.min(safePage, totalPages);
  const start = (current - 1) * safePerPage;
  return {
    page: current,
    perPage: safePerPage,
    total,
    totalPages,
    items: items.slice(start, start + safePerPage),
  };
};

export function Pagination({ page, totalPages, total, onPageChange }) {
  if (!total || totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50 text-sm">
      <p className="text-slate-500">
        Page {page} of {totalPages} ({total} records)
      </p>
      <div className="flex items-center gap-2">
        <button
          className="btn-secondary text-xs py-1 px-3 disabled:opacity-50"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          type="button"
        >
          Prev
        </button>
        <button
          className="btn-secondary text-xs py-1 px-3 disabled:opacity-50"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className={`card w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-display font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
