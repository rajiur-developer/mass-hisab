"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type Member = { _id: string; name: string; email: string; role: string };
type History = { _id: string; managerId: { name: string; email: string }; startDate: string; endDate: string | null; note?: string };
export default function ManagerRotationControl() {
  const [members, setMembers] = useState<Member[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [managerId, setManagerId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const result = await apiRequest<{ members: Member[]; history: History[] }>("/api/manager");
      setMembers(result.members || []);
      setHistory(result.history || []);
      if (!managerId && result.members?.[0]) setManagerId(result.members[0]._id);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load manager history."); }
  }
  useEffect(() => { load(); }, []);

  async function schedule(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      await apiRequest("/api/manager/schedule", { method: "PUT", body: JSON.stringify({ managerId, note }) });
      setMessage("Next month's manager has been scheduled.");
      setNote(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not schedule manager."); }
    finally { setBusy(false); }
  }

  return <>
    <div className="page-heading"><div><h1 className="page-title">Manager rotation</h1><p className="page-subtitle">Choose who will manage the mess from the first day of next month.</p></div></div>
    {error && <div className="alert alert-danger py-2 small">{error}</div>}{message && <div className="alert alert-success py-2 small">{message}</div>}
    <div className="card-clean section-card mb-4"><h2 className="section-title mb-3">Assign next month's manager</h2><form onSubmit={schedule} className="row g-2"><div className="col-12 col-md-5"><label className="form-label small">New manager</label><select required className="form-select" value={managerId} onChange={e => setManagerId(e.target.value)}>{members.map(m => <option key={m._id} value={m._id}>{m.name} · {m.email}</option>)}</select></div><div className="col-12 col-md-5"><label className="form-label small">Handover note (optional)</label><input className="form-control" value={note} onChange={e => setNote(e.target.value)} placeholder="Any instructions for next month" /></div><div className="col-12 col-md-2 d-flex align-items-end"><button disabled={busy || !managerId} className="btn-primary-custom w-100">Schedule</button></div></form><p className="small text-secondary mt-3 mb-0">The current manager remains in charge until the end of this month. The new role begins automatically next month.</p></div>
    <div className="card-clean section-card"><h2 className="section-title mb-3">Manager history</h2><div className="table-wrap"><table className="table"><thead><tr><th>Manager</th><th>Start</th><th>End</th><th>Handover note</th></tr></thead><tbody>{history.map(item => <tr key={item._id}><td><strong>{item.managerId?.name || "Unknown"}</strong><div className="small text-secondary">{item.managerId?.email}</div></td><td>{item.startDate.slice(0, 10)}</td><td>{item.endDate ? item.endDate.slice(0, 10) : "Current"}</td><td>{item.note || "—"}</td></tr>)}</tbody></table>{!history.length && <div className="empty-state">No manager history found.</div>}</div></div>
  </>;
}
