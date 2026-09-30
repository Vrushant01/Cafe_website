'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { AdminRouteGuard } from '@/components/admin/AdminRouteGuard';
import { useAdminHeader } from '@/contexts/AdminHeaderContext';
import { TableStatus } from '@chai-partner/shared';
import QRCode from 'qrcode';
import {
  LayoutGrid,
  Plus,
  Search,
  QrCode,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  Download,
  Printer,
  Copy,
  Check,
  X,
  AlertCircle,
  CheckCircle,
  Users,
  ChevronDown,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminTable {
  id: string;
  table_number: number;
  seat_count: number;
  status: TableStatus;
  is_active: boolean;
  qr_token: string;
  qr_version: number;
  current_session_id?: string | null;
  current_session?: { id: string; customer_name: string; status: string } | null;
  created_at?: string;
  updated_at?: string;
}

type FilterStatus = 'all' | 'available' | 'occupied' | 'disabled';
type SortBy = 'table_number' | 'status' | 'seat_count';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
const WEB_BASE = typeof window !== 'undefined' ? window.location.origin : 'https://chaipartner.in';

function getTableEntryUrl(qrToken: string): string {
  return `${WEB_BASE}/t/${qrToken}`;
}

function getStatusBadge(table: AdminTable) {
  if (!table.is_active) {
    return { label: 'DISABLED', cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  }
  switch (table.status) {
    case TableStatus.OCCUPIED:
      return { label: 'OCCUPIED', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    case TableStatus.AVAILABLE:
      return { label: 'AVAILABLE', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    default:
      return { label: String(table.status).toUpperCase(), cls: 'bg-gray-100 text-gray-600 border-gray-200' };
  }
}

// ─── Notification toast ────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-sm animate-in slide-in-from-bottom-4 duration-300 ${
      type === 'success' ? 'bg-white border-emerald-200 text-emerald-800' : 'bg-white border-red-200 text-red-700'
    }`}>
      {type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ─── Add/Edit Table Modal ──────────────────────────────────────────────────────

function TableFormModal({
  mode,
  existing,
  onClose,
  onSaved,
}: {
  mode: 'add' | 'edit';
  existing?: AdminTable;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tableNumber, setTableNumber] = useState(existing?.table_number?.toString() ?? '');
  const [seatCount, setSeatCount] = useState(existing?.seat_count?.toString() ?? '4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const num = parseInt(tableNumber, 10);
    const seats = parseInt(seatCount, 10);
    if (!num || num < 1) { setError('Table number must be a positive integer.'); return; }
    if (!seats || seats < 1) { setError('Seat count must be a positive integer.'); return; }

    setLoading(true);
    try {
      if (mode === 'add') {
        await apiFetch('/tables', { method: 'POST', body: JSON.stringify({ table_number: num, seat_count: seats }) });
      } else if (existing) {
        await apiFetch(`/tables/${existing.id}`, { method: 'PATCH', body: JSON.stringify({ table_number: num, seat_count: seats }) });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save table.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-divider shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
          <h2 className="text-base font-serif font-bold text-ink">{mode === 'add' ? 'Add Table' : `Edit Table ${existing?.table_number}`}</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-ink-muted uppercase tracking-widest mb-1.5">Table Number</label>
            <input
              type="number"
              min={1}
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              placeholder="e.g. 26"
              required
              className="w-full h-10 px-3 rounded-xl border border-divider text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold bg-canvas-warm/30"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-muted uppercase tracking-widest mb-1.5">Capacity (seats)</label>
            <input
              type="number"
              min={1}
              value={seatCount}
              onChange={e => setSeatCount(e.target.value)}
              placeholder="e.g. 4"
              required
              className="w-full h-10 px-3 rounded-xl border border-divider text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold bg-canvas-warm/30"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-divider text-sm font-semibold text-ink-muted hover:bg-canvas">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 h-10 rounded-xl bg-gold hover:bg-gold-deep text-white text-sm font-bold transition-all disabled:opacity-60">
              {loading ? 'Saving...' : mode === 'add' ? 'Create Table' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({ table, onClose, onDeleted }: { table: AdminTable; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await apiFetch(`/tables/${table.id}`, { method: 'DELETE' });
      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete table.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-divider shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
          <h2 className="text-base font-serif font-bold text-ink">Delete Table {table.table_number}?</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
            </div>
          )}
          <p className="text-sm text-ink-muted leading-relaxed">
            This table will be removed from active dining operations.{' '}
            <span className="font-semibold text-ink">Historical orders will be preserved.</span>
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-divider text-sm font-semibold text-ink-muted hover:bg-canvas">Cancel</button>
            <button onClick={handleDelete} disabled={loading} className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all disabled:opacity-60">
              {loading ? 'Deleting...' : 'Delete Table'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Disable Modal ─────────────────────────────────────────────────────────────

function DisableModal({ table, onClose, onDone }: { table: AdminTable; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const reasons = ['Maintenance', 'Reserved', 'Cleaning', 'Closed', 'Other'];

  const handleDisable = async () => {
    setLoading(true);
    try {
      await apiFetch(`/tables/${table.id}/disable`, { method: 'POST', body: JSON.stringify({ reason: reason || undefined }) });
      onDone();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-divider shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
          <h2 className="text-base font-serif font-bold text-ink">Disable Table {table.table_number}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-ink-muted" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-ink-muted">Customers scanning this QR code will see a &apos;table unavailable&apos; message.</p>
          <div>
            <label className="block text-xs font-bold text-ink-muted uppercase tracking-widest mb-2">Reason (optional)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {reasons.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${reason === r ? 'bg-gold/10 border-gold text-gold-deep' : 'border-divider text-ink-muted hover:border-gold/50'}`}
                >{r}</button>
              ))}
            </div>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Custom reason..."
              className="w-full h-9 px-3 rounded-xl border border-divider text-sm text-ink focus:outline-none focus:ring-2 focus:ring-gold/40 bg-canvas-warm/30"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-divider text-sm font-semibold text-ink-muted hover:bg-canvas">Cancel</button>
            <button onClick={handleDisable} disabled={loading} className="flex-1 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold disabled:opacity-60">
              {loading ? 'Disabling...' : 'Disable Table'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────

function QrModal({ table, onClose, onRegenerated }: { table: AdminTable; onClose: () => void; onRegenerated: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tableUrl = getTableEntryUrl(table.qr_token);

  useEffect(() => {
    QRCode.toDataURL(tableUrl, { width: 256, margin: 2, color: { dark: '#1a1209', light: '#fefcf7' } })
      .then(url => setQrDataUrl(url))
      .catch(() => {});
  }, [tableUrl]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(tableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `chai-partner-table-${table.table_number}-qr.png`;
    a.click();
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR – Table ${table.table_number}</title>
<style>
  body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; font-family: Georgia, serif; }
  .card { text-align: center; padding: 40px 32px; border: 1.5px solid #e5dcc7; border-radius: 16px; max-width: 300px; page-break-inside: avoid; }
  .brand { font-size: 11px; font-weight: bold; letter-spacing: 0.2em; text-transform: uppercase; color: #8B6914; margin-bottom: 8px; }
  .table-name { font-size: 28px; font-weight: bold; color: #1a1209; margin-bottom: 20px; }
  img { width: 200px; height: 200px; display: block; margin: 0 auto 20px; }
  .hint { font-size: 12px; color: #7a6a4a; margin-top: 12px; }
  @media print { body { margin: 0; } }
</style></head><body>
<div class="card">
  <div class="brand">Chai Partner</div>
  <div class="table-name">TABLE ${table.table_number}</div>
  <img src="${qrDataUrl}" alt="QR Code" />
  <div class="hint">Scan to view menu &amp; order</div>
</div>
</body></html>`);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  const handleRegen = async () => {
    setRegenLoading(true);
    try {
      await apiFetch(`/tables/${table.id}/qr/regenerate`, { method: 'POST' });
      setShowRegenConfirm(false);
      onRegenerated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Regeneration failed.');
    } finally {
      setRegenLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-divider shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider">
          <div>
            <h2 className="text-base font-serif font-bold text-ink">TABLE {table.table_number} — QR Code</h2>
            <span className="text-[10px] font-mono text-ink-faint">v{table.qr_version}</span>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-ink-muted" /></button>
        </div>

        <div className="px-6 py-5 flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <div className="p-3 rounded-2xl border-2 border-divider bg-canvas-warm/40">
              <img src={qrDataUrl} alt={`QR for Table ${table.table_number}`} className="w-48 h-48 rounded-xl" />
            </div>
          ) : (
            <div className="w-48 h-48 rounded-2xl bg-canvas-warm border border-divider animate-pulse" />
          )}

          <p className="text-[11px] text-ink-faint text-center">Scan this QR to join Table {table.table_number}</p>

          {/* URL display */}
          <div className="w-full flex items-center gap-2 p-2.5 bg-canvas-warm/60 rounded-xl border border-divider">
            <span className="text-[10px] text-ink-muted font-mono truncate flex-1">{tableUrl}</span>
            <button onClick={handleCopy} className="shrink-0 text-ink-muted hover:text-gold-deep transition-colors">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Action buttons */}
          <div className="w-full grid grid-cols-2 gap-2">
            <button onClick={handleDownload} disabled={!qrDataUrl} className="h-9 rounded-xl border border-divider text-xs font-semibold text-ink-muted hover:bg-canvas flex items-center justify-center gap-1.5 disabled:opacity-50">
              <Download className="w-3.5 h-3.5" /> Download PNG
            </button>
            <button onClick={handlePrint} disabled={!qrDataUrl} className="h-9 rounded-xl border border-divider text-xs font-semibold text-ink-muted hover:bg-canvas flex items-center justify-center gap-1.5 disabled:opacity-50">
              <Printer className="w-3.5 h-3.5" /> Print QR
            </button>
          </div>

          <div className="w-full border-t border-divider/60 pt-3">
            {!showRegenConfirm ? (
              <button
                onClick={() => setShowRegenConfirm(true)}
                className="w-full h-9 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs font-semibold text-amber-700 flex items-center justify-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate QR
              </button>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <p className="text-xs text-amber-800 font-medium">Existing printed QR codes will stop working. Continue?</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowRegenConfirm(false)} className="flex-1 h-8 rounded-lg border border-divider text-xs text-ink-muted hover:bg-canvas">Cancel</button>
                  <button onClick={handleRegen} disabled={regenLoading} className="flex-1 h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-60">
                    {regenLoading ? 'Regenerating...' : 'Regenerate QR'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function TablesPageContent() {
  const router = useRouter();
  const { setHeaderState } = useAdminHeader();

  const [tables, setTables] = useState<AdminTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('table_number');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal states
  const [addModal, setAddModal] = useState(false);
  const [editTable, setEditTable] = useState<AdminTable | null>(null);
  const [deleteTable, setDeleteTable] = useState<AdminTable | null>(null);
  const [disableTable, setDisableTable] = useState<AdminTable | null>(null);
  const [qrTable, setQrTable] = useState<AdminTable | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
  }, []);

  const fetchTables = useCallback(async () => {
    try {
      const data = await apiFetch<AdminTable[]>('/tables');
      setTables(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load tables', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    setHeaderState({ onRefresh: fetchTables });
    return () => setHeaderState({});
  }, [fetchTables, setHeaderState]);

  // ── Derived stats ────────────────────────────────────────────────

  const activeTables = tables.filter(t => t.is_active);
  const totalCount = tables.length;
  const occupiedCount = activeTables.filter(t => t.status === TableStatus.OCCUPIED).length;
  const availableCount = activeTables.filter(t => t.status === TableStatus.AVAILABLE).length;
  const activeQrCount = activeTables.length;

  // ── Filtering / sorting ──────────────────────────────────────────

  const filtered = tables
    .filter(t => {
      const q = search.toLowerCase();
      if (q && !String(t.table_number).includes(q)) return false;
      if (filterStatus === 'available') return t.is_active && t.status === TableStatus.AVAILABLE;
      if (filterStatus === 'occupied') return t.is_active && t.status === TableStatus.OCCUPIED;
      if (filterStatus === 'disabled') return !t.is_active;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'seat_count') return a.seat_count - b.seat_count;
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return a.table_number - b.table_number;
    });

  // ── Enable table ─────────────────────────────────────────────────

  const handleEnable = async (table: AdminTable) => {
    try {
      await apiFetch(`/tables/${table.id}/enable`, { method: 'POST' });
      showToast(`Table ${table.table_number} enabled.`);
      fetchTables();
    } catch (err: any) {
      showToast(err.message || 'Failed to enable.', 'error');
    }
  };

  // ── Print all QRs ─────────────────────────────────────────────────

  const handlePrintAll = async () => {
    const active = tables.filter(t => t.is_active);
    const cards: { tableNum: number; dataUrl: string }[] = [];
    for (const t of active) {
      const url = getTableEntryUrl(t.qr_token);
      try {
        const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
        cards.push({ tableNum: t.table_number, dataUrl });
      } catch {}
    }

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Chai Partner – All QR Codes</title>
<style>
  body{margin:0;padding:24px;font-family:Georgia,serif;background:#fff;}
  h1{font-size:16px;text-align:center;letter-spacing:.15em;text-transform:uppercase;color:#8B6914;margin-bottom:24px;}
  .grid{display:flex;flex-wrap:wrap;gap:20px;justify-content:center;}
  .card{text-align:center;border:1.5px solid #e5dcc7;border-radius:12px;padding:24px 20px;width:180px;page-break-inside: avoid;}
  .brand{font-size:9px;font-weight:bold;letter-spacing:.15em;text-transform:uppercase;color:#8B6914;margin-bottom:4px;}
  .tname{font-size:18px;font-weight:bold;color:#1a1209;margin-bottom:12px;}
  img{width:140px;height:140px;display:block;margin:0 auto 10px;}
  .hint{font-size:10px;color:#7a6a4a;}
  @media print{body{padding:0;}h1{display:none;}}
</style></head><body>
<h1>Chai Partner — Table QR Codes</h1>
<div class="grid">
${cards.map(c => `<div class="card"><div class="brand">Chai Partner</div><div class="tname">TABLE ${c.tableNum}</div><img src="${c.dataUrl}" /><div class="hint">Scan to order</div></div>`).join('')}
</div>
</body></html>`);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 500);
  };

  // ── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'available', label: 'Available' },
    { value: 'occupied', label: 'Occupied' },
    { value: 'disabled', label: 'Disabled' },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gold-deep mb-1">Owner / Admin</span>
          <h1 className="text-2xl font-serif font-bold text-ink leading-tight">Table Management</h1>
          <p className="text-sm text-ink-muted mt-0.5">Manage dining tables, seating status, QR codes, and configuration.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintAll}
            className="h-9 px-4 rounded-xl border border-divider text-xs font-semibold text-ink-muted hover:bg-canvas flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5" /> Print All QRs
          </button>
          <button
            onClick={() => setAddModal(true)}
            className="h-9 px-4 rounded-xl bg-gold hover:bg-gold-deep text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Table
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Tables', value: totalCount, color: 'text-ink' },
          { label: 'Occupied', value: occupiedCount, color: 'text-amber-600' },
          { label: 'Available', value: availableCount, color: 'text-emerald-600' },
          { label: 'Active QR Codes', value: activeQrCount, color: 'text-gold-deep' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-divider rounded-2xl p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">{card.label}</p>
            <p className={`text-3xl font-serif font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tables..."
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-divider text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
          />
        </div>
        <div className="flex items-center gap-2">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`h-9 px-3 rounded-xl text-xs font-semibold border transition-all ${
                filterStatus === opt.value
                  ? 'bg-gold/10 border-gold text-gold-deep'
                  : 'bg-white border-divider text-ink-muted hover:border-gold/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="h-9 pl-3 pr-7 rounded-xl border border-divider text-xs font-semibold text-ink-muted bg-white focus:outline-none appearance-none cursor-pointer hover:border-gold/50"
            >
              <option value="table_number">Sort: Number</option>
              <option value="status">Sort: Status</option>
              <option value="seat_count">Sort: Capacity</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-faint pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-ink-muted">
          <LayoutGrid className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No tables found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(table => {
            const badge = getStatusBadge(table);
            return (
              <div
                key={table.id}
                className={`bg-white border rounded-2xl p-4 space-y-3 transition-all hover:shadow-sm ${
                  !table.is_active ? 'border-gray-200 opacity-70' : 'border-divider'
                }`}
              >
                {/* Table header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint">Table</p>
                    <p className="text-xl font-serif font-bold text-ink leading-tight">{String(table.table_number).padStart(2, '0')}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Capacity + session */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-ink-muted">
                    <Users className="w-3.5 h-3.5" />
                    <span>{table.seat_count} seat{table.seat_count !== 1 ? 's' : ''}</span>
                  </div>
                  {table.current_session && (
                    <div className="text-[11px] text-ink-muted truncate">
                      Session: <span className="font-mono text-ink">{table.current_session.customer_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] text-ink-faint">
                    <QrCode className="w-3 h-3" />
                    <span>QR v{table.qr_version} · {table.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-divider/50">
                  <button
                    onClick={() => setEditTable(table)}
                    title="Edit"
                    className="flex-1 h-8 rounded-lg border border-divider text-ink-muted hover:bg-canvas hover:text-ink text-xs flex items-center justify-center gap-1 transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setQrTable(table)}
                    title="QR Code"
                    className="h-8 w-8 rounded-lg border border-divider text-ink-muted hover:bg-canvas hover:text-gold-deep flex items-center justify-center transition-all"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                  {table.is_active ? (
                    <button
                      onClick={() => setDisableTable(table)}
                      title="Disable"
                      className="h-8 w-8 rounded-lg border border-amber-100 text-amber-500 hover:bg-amber-50 flex items-center justify-center transition-all"
                    >
                      <PowerOff className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEnable(table)}
                      title="Enable"
                      className="h-8 w-8 rounded-lg border border-emerald-100 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-all"
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (table.status === TableStatus.OCCUPIED) {
                        showToast('This table currently has an active dining session and cannot be deleted.', 'error');
                        return;
                      }
                      setDeleteTable(table);
                    }}
                    title="Delete"
                    className="h-8 w-8 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 flex items-center justify-center transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {addModal && (
        <TableFormModal
          mode="add"
          onClose={() => setAddModal(false)}
          onSaved={() => { fetchTables(); showToast('Table created successfully.'); }}
        />
      )}
      {editTable && (
        <TableFormModal
          mode="edit"
          existing={editTable}
          onClose={() => setEditTable(null)}
          onSaved={() => { fetchTables(); showToast(`Table ${editTable.table_number} updated.`); }}
        />
      )}
      {deleteTable && (
        <DeleteModal
          table={deleteTable}
          onClose={() => setDeleteTable(null)}
          onDeleted={() => { fetchTables(); showToast(`Table ${deleteTable.table_number} deleted.`); }}
        />
      )}
      {disableTable && (
        <DisableModal
          table={disableTable}
          onClose={() => setDisableTable(null)}
          onDone={() => { fetchTables(); showToast(`Table ${disableTable.table_number} disabled.`); }}
        />
      )}
      {qrTable && (
        <QrModal
          table={qrTable}
          onClose={() => setQrTable(null)}
          onRegenerated={() => { fetchTables(); showToast(`QR code for Table ${qrTable.table_number} regenerated.`); }}
        />
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Export with Auth Guard ────────────────────────────────────────────────────

export default function TablesPage() {
  return (
    <AdminRouteGuard requiredPermission="tables.manage" title="Table Management">
      <TablesPageContent />
    </AdminRouteGuard>
  );
}
