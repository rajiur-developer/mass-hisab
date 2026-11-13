"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { readDemoSession } from "@/lib/demo-auth";

type Member = { _id: string; name: string };
type RecordItem = { id: string; description: string; amountPaisa: number; boughtBy: { id: string; name: string } | null; receiptUrl?: string | null };
type Daily = { date: string; totalPaisa: number; totalMeals: number; shares: { userId: string; name: string; meals: number; sharePaisa: number }[]; records: RecordItem[] };
type Summary = { month: string; totalPaisa: number; weeklyBudgetPaisa?: number; weeklyBudgetMode?: "Actual" | "Fixed"; weekly?: { weekStart: string; totalPaisa: number; budgetPaisa: number }[]; daily: Daily[]; memberShares?: { name: string; meals: number; sharePaisa: number }[]; monthlyMySharePaisa?: number };
const money = (paisa: number) => "৳ " + (paisa / 100).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthNow = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit" }).format(new Date());

export default function BazarControl() {
  const [month, setMonth] = useState(monthNow());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [manager, setManager] = useState(false);
  const [budget, setBudget] = useState("0");
  const [mode, setMode] = useState<"Actual" | "Fixed">("Actual");
  const [boughtBy, setBoughtBy] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date()));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiRequest<Summary & { success: boolean }>(`/api/bazar/summary?month=${month}`);
      setSummary(data);
      if (data.weeklyBudgetPaisa !== undefined) setBudget((data.weeklyBudgetPaisa / 100).toFixed(2));
      if (data.weeklyBudgetMode) setMode(data.weeklyBudgetMode);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load bazar summary."); }
  }, [month]);

  useEffect(() => {
    const session = readDemoSession();
    setManager(session?.role === "Manager");
    load();
    if (session?.role === "Manager") {
      apiRequest<{ members: Member[] }>("/api/members").then(result => {
        setMembers(result.members || []);
        if (result.members?.[0]) setBoughtBy(result.members[0]._id);
      }).catch(e => setError(e instanceof Error ? e.message : "Unable to load members."));
    }
  }, [load]);

  async function save(action: () => Promise<unknown>, done: string) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage(done); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save bazar data."); }
    finally { setBusy(false); }
  }

  function addRecord(e: React.FormEvent) {
    e.preventDefault();
    return save(() => apiRequest("/api/bazar/records", { method: "POST", body: JSON.stringify({ boughtBy, amount: Number(amount), description, date }) }), "Bazar record added.");
  }
  function saveWeekly(e: React.FormEvent) {
    e.preventDefault();
    return save(() => apiRequest("/api/bazar/weekly-setting", { method: "PUT", body: JSON.stringify({ amount: Number(budget), mode }) }), "Weekly bazar setting updated.");
  }
  function removeRecord(id: string) {
    if (!window.confirm("Delete this bazar record?")) return;
    return save(() => apiRequest(`/api/bazar/records/${id}`, { method: "DELETE" }), "Bazar record deleted.");
  }

  return <>
    <div className="page-heading"><div><h1 className="page-title">Bazar & market accounts</h1><p className="page-subtitle">Weekly, daily, per-member and monthly market calculations.</p></div><input aria-label="Report month" type="month" className="form-control" style={{ maxWidth: 180 }} value={month} onChange={e => setMonth(e.target.value)} /></div>
    {error && <div className="alert alert-danger py-2 small">{error}</div>}{message && <div className="alert alert-success py-2 small">{message}</div>}
    <div className="row g-3 mb-4">
      <div className="col-12 col-md-6"><div className="card-clean stat-card"><div className="stat-top"><span>Monthly total bazar</span><span className="stat-icon"><i className="bi bi-basket2" /></span></div><div className="stat-value">{summary ? money(summary.totalPaisa) : "—"}</div><div className="stat-note">{month}</div></div></div>
      <div className="col-12 col-md-6"><div className="card-clean stat-card"><div className="stat-top"><span>{manager ? "Monthly member share overview" : "My monthly bazar share"}</span><span className="stat-icon"><i className="bi bi-people" /></span></div><div className="stat-value">{summary ? manager ? String(summary.memberShares?.length || 0) + " members" : money(summary.monthlyMySharePaisa || 0) : "—"}</div><div className="stat-note">Calculated from each person's meal count</div></div></div>
    </div>
    {manager && <div className="card-clean section-card mb-4"><h2 className="section-title mb-3">Weekly bazar amount</h2><form onSubmit={saveWeekly} className="row g-2 align-items-end"><div className="col-12 col-md-4"><label className="form-label small">Weekly amount (৳)</label><input required min="0" step="0.01" type="number" className="form-control" value={budget} onChange={e => setBudget(e.target.value)} /></div><div className="col-12 col-md-4"><label className="form-label small">Calculation mode</label><select className="form-select" value={mode} onChange={e => setMode(e.target.value as "Actual" | "Fixed")}><option value="Actual">Use actual weekly bazar</option><option value="Fixed">Use fixed weekly amount</option></select></div><div className="col-12 col-md-4"><button disabled={busy} className="btn-primary-custom w-100">Save weekly setting</button></div></form></div>}
    {manager && <div className="card-clean section-card mb-4"><h2 className="section-title mb-3">Add daily bazar</h2><form onSubmit={addRecord} className="row g-2"><div className="col-12 col-md-3"><label className="form-label small">Member who bought</label><select required className="form-select" value={boughtBy} onChange={e => setBoughtBy(e.target.value)}>{members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}</select></div><div className="col-12 col-md-2"><label className="form-label small">Amount (৳)</label><input required min="0.01" step="0.01" type="number" className="form-control" value={amount} onChange={e => setAmount(e.target.value)} /></div><div className="col-12 col-md-3"><label className="form-label small">Description</label><input required className="form-control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Rice, vegetables..." /></div><div className="col-12 col-md-2"><label className="form-label small">Date</label><input required type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} /></div><div className="col-12 col-md-2 d-flex align-items-end"><button disabled={busy || !boughtBy} className="btn-primary-custom w-100">Add record</button></div></form></div>}
    <div className="card-clean section-card mb-4"><h2 className="section-title mb-3">Weekly bazar totals</h2><div className="table-wrap"><table className="table"><thead><tr><th>Week starts</th><th>Actual bazar</th>{manager && <th>Weekly fixed amount</th>}</tr></thead><tbody>{(summary?.weekly || []).map(w => <tr key={w.weekStart}><td>{w.weekStart}</td><td className="fw-bold">{money(w.totalPaisa)}</td>{manager && <td>{money(w.budgetPaisa)}</td>}</tr>)}</tbody></table></div></div>
    {manager && <div className="card-clean section-card mb-4"><h2 className="section-title mb-3">Per-member monthly bazar share</h2><div className="table-wrap"><table className="table"><thead><tr><th>Member</th><th>Total meals</th><th>Calculated share</th></tr></thead><tbody>{(summary?.memberShares || []).map(m => <tr key={m.name}><td>{m.name}</td><td>{m.meals}</td><td className="fw-bold">{money(m.sharePaisa)}</td></tr>)}</tbody></table></div></div>}
    <div className="card-clean section-card"><h2 className="section-title mb-3">Daily bazar details</h2><div className="table-wrap"><table className="table"><thead><tr><th>Date</th><th>Total bazar</th><th>Total meals</th>{!manager && <th>My share</th>}{manager && <th>Records</th>}</tr></thead><tbody>{(summary?.daily || []).filter(d => d.totalPaisa > 0 || d.totalMeals > 0).map(day => <tr key={day.date}><td>{day.date}</td><td className="fw-bold">{money(day.totalPaisa)}</td><td>{day.totalMeals}</td>{!manager && <td>{money(day.mySharePaisa || 0)}</td>}{manager && <td>{day.records.map(record => <div key={record.id} className="d-flex justify-content-between gap-2 py-1"><span>{record.description} · {record.boughtBy?.name || "Member"} ({money(record.amountPaisa)})</span><button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => removeRecord(record.id)}>Delete</button></div>)}</td>}</tr>)}</tbody></table>{!summary?.daily?.length && <div className="empty-state">No bazar activity for this month yet.</div>}</div></div>
  </>;
}
