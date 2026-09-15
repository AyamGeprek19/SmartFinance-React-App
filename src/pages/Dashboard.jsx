import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api';

const money = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const categories = ['Gaji', 'Bonus', 'Usaha', 'Perumahan & Sewa', 'Makanan & Minuman', 'Transportasi', 'Belanja', 'Tagihan', 'Lainnya'];
const monthNow = () => new Date().toISOString().slice(0, 7);
const dateNow = () => new Date().toISOString().slice(0, 10);

function CashflowChart({ transactions, days }) {
  const points = useMemo(() => Array.from({ length: days }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);
    const day = transactions.filter((item) => item.date.slice(0, 10) === key);
    return {
      label: date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
      income: day.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0),
      expense: day.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0),
    };
  }), [transactions, days]);
  const max = Math.max(1, ...points.flatMap((point) => [point.income, point.expense]));
  const line = (key) => points.map((point, index) => `${index ? 'L' : 'M'} ${(index / Math.max(1, points.length - 1)) * 600} ${220 - (point[key] / max) * 180}`).join(' ');
  return <div className="relative h-64"><svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 600 240">{[40, 100, 160, 220].map((y) => <line key={y} stroke="#31353e" strokeDasharray="3 3" x1="0" x2="600" y1={y} y2={y} />)}<path d={line('income')} fill="none" stroke="#4edea3" strokeWidth="3" /><path d={line('expense')} fill="none" stroke="#ff7886" strokeWidth="3" /></svg><div className="absolute bottom-0 inset-x-0 flex justify-between text-[10px] text-on-surface-variant"><span>{points[0]?.label}</span><span>{points[Math.floor(points.length / 2)]?.label}</span><span>{points.at(-1)?.label}</span></div></div>;
}

export default function Dashboard({ user, onLogout }) {
  const [view, setView] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Semua Kategori');
  const [days, setDays] = useState(30);
  const [showForm, setShowForm] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ type: 'expense', description: '', category: 'Makanan & Minuman', amount: '', date: dateNow() });
  const [budgetForm, setBudgetForm] = useState({ category: categories[3], amount: '', month: monthNow() });

  const loadTransactions = useCallback(async () => {
    setTransactions((await apiRequest('/transactions')).transactions);
  }, []);
  const loadBudgets = useCallback(async () => {
    setBudgets((await apiRequest(`/budgets?month=${budgetForm.month}`)).budgets);
  }, [budgetForm.month]);

  useEffect(() => { loadTransactions().catch((e) => setError(e.message)); loadBudgets().catch((e) => setError(e.message)); const timer = setInterval(() => { loadTransactions().catch(() => {}); loadBudgets().catch(() => {}); }, 10000); return () => clearInterval(timer); }, [loadTransactions, loadBudgets]);

  const inflows = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const outflows = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  const filtered = transactions.filter((item) => `${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase()) && (category === 'Semua Kategori' || item.category === category));

  async function addTransaction(event) {
    event.preventDefault();
    if (savingTransaction) return;
    setError('');
    setSavingTransaction(true);
    try {
      const data = await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });

      // Reload from Neon so the list never relies only on optimistic UI state.
      await loadTransactions();
      setShowForm(false);
      setForm({ type: 'expense', description: '', category: 'Makanan & Minuman', amount: '', date: dateNow() });
      setView('transactions');
    } catch (saveError) {
      setError(saveError.message || 'Gagal menyimpan transaksi. Periksa koneksi API.');
    } finally {
      setSavingTransaction(false);
    }
  }
  async function addBudget(event) {
    event.preventDefault(); setError('');
    try {
      await apiRequest('/budgets', { method: 'POST', body: JSON.stringify(budgetForm) });
      await loadBudgets(); setBudgetForm({ ...budgetForm, amount: '' });
    } catch (saveError) { setError(saveError.message); }
  }
  async function remove(id, type) {
    await apiRequest(`/${type}/${id}`, { method: 'DELETE' });
    if (type === 'transactions') setTransactions((current) => current.filter((item) => item.id !== id));
    else setBudgets((current) => current.filter((item) => item.id !== id));
  }

  const nav = (next) => { setView(next); setError(''); };
  return <div className="bg-background text-on-surface min-h-screen">
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest z-50 flex flex-col justify-between shadow-lg"><div><div className="h-16 flex items-center px-6 font-semibold text-lg">SmartFinance</div><nav className="px-4 py-3 space-y-1"><Nav active={view === 'dashboard'} icon="grid_view" label="Dashboard" onClick={() => nav('dashboard')} /><Nav active={view === 'transactions'} icon="receipt_long" label="Transactions" onClick={() => nav('transactions')} /><Nav active={view === 'budgeting'} icon="pie_chart" label="Budgeting & Analisis" onClick={() => nav('budgeting')} /></nav></div><div className="p-4 space-y-2"><button onClick={() => setShowForm(true)} className="w-full py-3 rounded-lg bg-primary-container text-on-primary hover:bg-primary">+ Catat Transaksi</button><button onClick={onLogout} className="w-full py-3 rounded-lg bg-surface-container-high">Keluar</button></div></aside>
    <div className="pl-64"><header className="fixed top-0 left-64 right-0 h-16 z-40 bg-surface-container-lowest/90 flex items-center justify-between px-8"><input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full max-w-md bg-surface-container-low px-4 py-2 rounded-lg outline-none" placeholder="Cari transaksi..." /><div className="text-right"><div>{user?.username}</div><div className="text-xs text-on-surface-variant">{user?.email}</div></div></header>
      <main className="pt-16"><div className="p-8 space-y-6">
        {error && <div className="p-3 rounded bg-red-500/10 text-red-300">{error}</div>}
        {view === 'dashboard' && <DashboardView transactions={transactions} inflows={inflows} outflows={outflows} days={days} setDays={setDays} setView={setView} />}
        {view === 'transactions' && <TransactionView transactions={filtered} category={category} setCategory={setCategory} onDelete={(id) => remove(id, 'transactions')} onAdd={() => setShowForm(true)} />}
        {view === 'budgeting' && <BudgetView budgets={budgets} form={budgetForm} setForm={setBudgetForm} onSubmit={addBudget} onDelete={(id) => remove(id, 'budgets')} transactions={transactions} />}
      </div></main>
    </div>
    {showForm && <TransactionModal form={form} setForm={setForm} error={error} saving={savingTransaction} onSubmit={addTransaction} onClose={() => setShowForm(false)} />}
  </div>;
}

function Nav({ active, icon, label, onClick }) { return <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left ${active ? 'bg-surface-container text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}><span className="material-symbols-outlined text-lg">{icon}</span>{label}</button>; }
function Stat({ title, value, color = '' }) { return <div className="bg-surface-container-low p-5 rounded-xl"><div className="text-xs text-on-surface-variant uppercase">{title}</div><div className={`text-2xl font-bold mt-2 ${color}`}>{value}</div></div>; }
function DashboardView({ transactions, inflows, outflows, days, setDays, setView }) { return <><div className="flex justify-between items-center bg-surface-container-low p-6 rounded-xl"><div><h1 className="text-2xl font-semibold">Ringkasan Keuangan</h1><p className="text-sm text-on-surface-variant">Data terhubung langsung ke database Neon.</p></div><button onClick={() => setView('transactions')} className="text-primary">Lihat semua transaksi →</button></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Stat title="Saldo Bersih" value={money.format(inflows - outflows)} /><Stat title="Total Pemasukan" value={`+${money.format(inflows)}`} color="text-primary" /><Stat title="Total Pengeluaran" value={`-${money.format(outflows)}`} color="text-tertiary" /></div><section className="bg-surface-container-low p-5 rounded-xl"><div className="flex justify-between mb-4"><h2 className="font-semibold">Grafik Arus Kas Real-time</h2><div><button onClick={() => setDays(7)} className={`px-3 py-1 ${days === 7 ? 'bg-surface-variant' : ''}`}>7 Hari</button><button onClick={() => setDays(30)} className={`px-3 py-1 ${days === 30 ? 'bg-surface-variant' : ''}`}>30 Hari</button></div></div><div className="flex gap-4 text-xs mb-2"><span className="text-primary">● Pemasukan</span><span className="text-tertiary">● Pengeluaran</span></div><CashflowChart transactions={transactions} days={days} /></section></>; }
function TransactionView({ transactions, category, setCategory, onDelete, onAdd }) { return <section className="bg-surface-container-low rounded-xl overflow-hidden"><div className="p-5 flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-semibold">Rekap Semua Transaksi</h1><p className="text-sm text-on-surface-variant">{transactions.length} transaksi tercatat</p></div><div className="flex gap-2"><select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-surface-container p-2 rounded"><option>Semua Kategori</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><button onClick={onAdd} className="bg-primary text-on-primary px-4 rounded">+ Tambah</button></div></div>{transactions.length ? transactions.map((item) => <div key={item.id} className="px-5 py-4 border-t border-surface-container flex justify-between"><div><div className="font-medium">{item.description}</div><div className="text-xs text-on-surface-variant">{item.category} · {item.date}</div></div><div className="flex gap-4 items-center"><b className={item.type === 'income' ? 'text-primary' : 'text-tertiary'}>{item.type === 'income' ? '+' : '-'}{money.format(item.amount)}</b><button onClick={() => onDelete(item.id)} className="text-xs text-on-surface-variant hover:text-tertiary">Hapus</button></div></div>) : <p className="p-10 text-center text-on-surface-variant">Belum ada transaksi.</p>}</section>; }
function BudgetView({ budgets, form, setForm, onSubmit, onDelete, transactions }) { const total = budgets.reduce((sum, item) => sum + item.amount, 0); const spent = budgets.reduce((sum, item) => sum + item.spent, 0); return <><div><h1 className="text-2xl font-semibold">Budgeting & Analisis</h1><p className="text-on-surface-variant">Tentukan budget awal dan pantau realisasi pengeluaran.</p></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Stat title="Total Budget" value={money.format(total)} /><Stat title="Sudah Terpakai" value={money.format(spent)} color="text-tertiary" /><Stat title="Sisa Budget" value={money.format(total - spent)} color="text-primary" /></div><form onSubmit={onSubmit} className="bg-surface-container-low p-5 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end"><label className="text-sm">Bulan<input required type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className="block w-full mt-1 bg-surface-container p-3 rounded" /></label><label className="text-sm">Kategori<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="block w-full mt-1 bg-surface-container p-3 rounded">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm">Budget (Rp)<input required min="1" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="block w-full mt-1 bg-surface-container p-3 rounded" placeholder="5000000" /></label><button className="bg-primary text-on-primary p-3 rounded">Simpan Budget</button></form><div className="space-y-3">{budgets.map((item) => { const percent = Math.min(100, (item.spent / item.amount) * 100); return <div key={item.id} className="bg-surface-container-low p-5 rounded-xl"><div className="flex justify-between"><b>{item.category}</b><span>{money.format(item.spent)} / {money.format(item.amount)}</span></div><div className="h-3 bg-surface-container-highest rounded-full mt-3"><div className={`h-full rounded-full ${percent >= 100 ? 'bg-tertiary' : 'bg-primary'}`} style={{ width: `${percent}%` }} /></div><div className="flex justify-between text-xs text-on-surface-variant mt-2"><span>{percent.toFixed(0)}% terpakai</span><button onClick={() => onDelete(item.id)} className="hover:text-tertiary">Hapus budget</button></div></div>; })}{!budgets.length && <p className="text-center p-8 text-on-surface-variant">Belum ada budget untuk bulan ini.</p>}</div></>; }
function TransactionModal({ form, setForm, error, saving, onSubmit, onClose }) { return <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"><form onSubmit={onSubmit} className="bg-surface-container-lowest p-6 rounded-xl w-full max-w-md space-y-4"><div className="flex justify-between"><h2 className="text-lg font-semibold">Catat Transaksi</h2><button type="button" onClick={onClose}>✕</button></div>{error && <p className="text-sm text-tertiary">{error}</p>}<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-surface-container p-3 rounded"><option value="expense">Pengeluaran</option><option value="income">Pemasukan</option></select><input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-surface-container p-3 rounded" placeholder="Keterangan" /><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-surface-container p-3 rounded">{categories.map((item) => <option key={item}>{item}</option>)}</select><input required min="1" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full bg-surface-container p-3 rounded" placeholder="Nominal Rupiah" /><input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full bg-surface-container p-3 rounded" /><button disabled={saving} className="w-full bg-primary text-on-primary p-3 rounded font-semibold disabled:opacity-60">{saving ? 'Menyimpan ke Neon...' : 'Simpan Transaksi'}</button></form></div>; }
