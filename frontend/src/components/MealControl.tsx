"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { readDemoSession } from "@/lib/demo-auth";

type MealKey = "breakfast" | "lunch" | "dinner";
type MealRow = { user: { id: string; name: string; email: string; phone?: string }; breakfast: boolean; lunch: boolean; dinner: boolean };
type MealRequest = { id: string; user: { id: string; name: string; email: string }; meal: MealKey; enabled: boolean; status: "Pending" | "Approved" | "Rejected"; createdAt: string };
type TodayData = { date: string; timezone: string; currentTime: string; deadline: string; requestOpen: boolean; members: MealRow[]; requests: MealRequest[] };
const mealLabels: Record<MealKey, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

export default function MealControl() {
  const [data, setData] = useState<TodayData | null>(null);
  const [role, setRole] = useState<"Manager" | "Member" | null>(null);
  const [deadlineInput, setDeadlineInput] = useState("20:00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await apiRequest<TodayData & { success: boolean }>("/api/meals/today");
      setData(result);
      setDeadlineInput(result.deadline);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load today's meals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setRole(readDemoSession()?.role || null);
    load();
  }, [load]);

  const isManager = role === "Manager";

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setSaving(false);
    }
  }

  function requestMeal(meal: MealKey, enabled: boolean) {
    return runAction(
      () => apiRequest("/api/meals/requests", { method: "POST", body: JSON.stringify({ meal, enabled }) }),
      `${mealLabels[meal]} ${enabled ? "ON" : "OFF"} request sent.`
    );
  }

  function updateMeal(userId: string, meal: MealKey, enabled: boolean) {
    return runAction(
      () => apiRequest(`/api/meals/${userId}`, { method: "PATCH", body: JSON.stringify({ meal, enabled }) }),
      "Member meal status updated."
    );
  }

  function reviewRequest(id: string, status: "Approved" | "Rejected") {
    return runAction(
      () => apiRequest(`/api/meals/requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
      `Request ${status.toLowerCase()}.`
    );
  }

  function saveDeadline() {
    return runAction(
      () => apiRequest("/api/meals/deadline", { method: "PUT", body: JSON.stringify({ time: deadlineInput }) }),
      "Common request deadline updated."
    );
  }

  if (loading) return <div className="card-clean section-card">Loading today's meal information…</div>;
  if (error && !data) return <div className="card-clean section-card"><h1 className="section-title">Meal API unavailable</h1><p className="section-subtitle">{error}</p><p className="small text-secondary mb-0">Sign in through the backend API first. Demo-only browser sessions do not authorize database requests.</p><button className="btn-primary-custom mt-3" onClick={() => { setLoading(true); load(); }}>Retry</button></div>;
  if (!data) return null;

  const myRow = data.members[0];
  return <>
    <div className="page-heading"><div><h1 className="page-title">{isManager ? "Daily meal control" : "My meal requests"}</h1><p className="page-subtitle">Breakfast, lunch and dinner · {data.date} · {data.timezone}</p></div></div>
    {error && <div className="alert alert-danger py-2 small">{error}</div>}
    {notice && <div className="alert alert-success py-2 small">{notice}</div>}
    <div className="card-clean section-card mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div><h2 className="section-title">Common request deadline</h2><p className="section-subtitle mb-0">{isManager ? "One cutoff applies to all members and all three meals." : "Requests close at the time set by your moderator."}</p></div>
        {isManager ? <div className="d-flex gap-2 align-items-center"><input aria-label="Common deadline" type="time" className="form-control" value={deadlineInput} onChange={e => setDeadlineInput(e.target.value)} /><button disabled={saving} className="btn-primary-custom" onClick={saveDeadline}>Save deadline</button></div> : <div className="text-end"><div className="fw-bold fs-5">{data.deadline}</div><span className={"badge-soft " + (data.requestOpen ? "" : "badge-warn")}>{data.requestOpen ? "Requests open" : "Requests closed"}</span></div>}
      </div>
    </div>

    {isManager ? <div className="card-clean section-card mb-4">
      <h2 className="section-title mb-3">All members · today</h2>
      <div className="table-wrap"><table className="table"><thead><tr><th>Member</th>{(Object.keys(mealLabels) as MealKey[]).map(meal => <th key={meal}>{mealLabels[meal]}</th>)}</tr></thead><tbody>
        {data.members.map(row => <tr key={row.user.id}><td><strong>{row.user.name}</strong><div className="small text-secondary">{row.user.email}</div></td>{(Object.keys(mealLabels) as MealKey[]).map(meal => <td key={meal}><button disabled={saving} className={"btn btn-sm " + (row[meal] ? "btn-success" : "btn-outline-secondary")} onClick={() => updateMeal(row.user.id, meal, !row[meal])}>{row[meal] ? "ON" : "OFF"}</button></td>)}</tr>)}
      </tbody></table>{data.members.length === 0 && <div className="empty-state">No active members found.</div>}</div>
      <p className="small text-secondary mb-0">Moderator changes are applied directly to today's meal record.</p>
    </div> : <div className="row g-3 mb-4">
      {(Object.keys(mealLabels) as MealKey[]).map(meal => <div className="col-12 col-md-4" key={meal}><div className="card-clean stat-card h-100"><div className="d-flex align-items-center gap-2 mb-3"><span className="stat-icon"><i className={"bi " + (meal === "breakfast" ? "bi-sunrise" : meal === "lunch" ? "bi-sun" : "bi-moon-stars")} /></span><strong>{mealLabels[meal]}</strong></div><div className="stat-value">{myRow?.[meal] ? "ON" : "OFF"}</div><div className="stat-note mb-3">Current approved status</div><div className="d-flex gap-2"><button disabled={!data.requestOpen || saving} onClick={() => requestMeal(meal, true)} className="btn btn-success flex-fill">Request ON</button><button disabled={!data.requestOpen || saving} onClick={() => requestMeal(meal, false)} className="btn btn-outline-secondary flex-fill">Request OFF</button></div></div></div>)}
    </div>}

    <div className="card-clean section-card"><h2 className="section-title mb-3">{isManager ? "All member requests" : "My request history"}</h2><div className="table-wrap"><table className="table"><thead><tr>{isManager && <th>Member</th>}<th>Meal</th><th>Requested</th><th>Status</th>{isManager && <th>Action</th>}</tr></thead><tbody>
      {data.requests.map(request => <tr key={request.id}>{isManager && <td>{request.user.name}</td>}<td>{mealLabels[request.meal]}</td><td>{request.enabled ? "ON" : "OFF"}</td><td><span className={"badge-soft " + (request.status === "Pending" ? "badge-warn" : "")}>{request.status}</span></td>{isManager && <td>{request.status === "Pending" ? <div className="d-flex gap-2"><button disabled={saving} className="btn btn-sm btn-success" onClick={() => reviewRequest(request.id, "Approved")}>Approve</button><button disabled={saving} className="btn btn-sm btn-outline-danger" onClick={() => reviewRequest(request.id, "Rejected")}>Reject</button></div> : "—"}</td>}</tr>)}
    </tbody></table>{data.requests.length === 0 && <div className="empty-state">No meal requests yet.</div>}</div></div>
  </>;
}
