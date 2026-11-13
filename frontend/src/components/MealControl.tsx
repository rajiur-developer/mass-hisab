"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { readDemoSession } from "@/lib/demo-auth";

type MealKey = "breakfast" | "lunch" | "dinner";
type MealRow = { user: { id: string; name: string; email: string; phone?: string }; breakfast: boolean; lunch: boolean; dinner: boolean; hasDateOverride?: boolean };
type MealRequest = { id: string; user: { id: string; name: string; email: string }; meal: MealKey; enabled: boolean; status: "Pending" | "Approved" | "Rejected"; createdAt: string };
type MealData = { date: string; timezone: string; currentTime?: string; deadline?: string; requestOpen?: boolean; members: MealRow[]; requests: MealRequest[] };
const labels: Record<MealKey, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
const mealKeys: MealKey[] = ["breakfast", "lunch", "dinner"];
const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default function MealControl() {
  const [data, setData] = useState<MealData | null>(null);
  const [role, setRole] = useState<"Manager" | "Member" | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isManager = role === "Manager";
  const load = useCallback(async (date: string, manager: boolean) => {
    setError("");
    try {
      const result = await apiRequest<MealData & { success: boolean }>(manager ? `/api/meals/date/${date}` : "/api/meals/today");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load meal information.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const currentRole = readDemoSession()?.role || null;
    setRole(currentRole);
    load(selectedDate, currentRole === "Manager");
  }, [load, selectedDate]);

  async function perform(action: () => Promise<unknown>, message: string) {
    setSaving(true); setError(""); setNotice("");
    try {
      await action();
      setNotice(message);
      await load(selectedDate, isManager);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save this change."); }
    finally { setSaving(false); }
  }

  function updateMemberMeal(userId: string, meal: MealKey, enabled: boolean) {
    return perform(
      () => apiRequest(`/api/meals/${userId}/date/${selectedDate}`, { method: "PATCH", body: JSON.stringify({ meal, enabled }) }),
      `${labels[meal]} updated for ${selectedDate}.`
    );
  }

  function updateMyPreference(meal: MealKey, enabled: boolean) {
    return perform(
      () => apiRequest("/api/meals/preferences", { method: "PUT", body: JSON.stringify({ [meal]: enabled }) }),
      `${labels[meal]} recurring setting turned ${enabled ? "ON" : "OFF"}.`
    );
  }

  if (loading) return <div className="card-clean section-card">Loading meal information…</div>;
  if (error && !data) return <div className="card-clean section-card"><h1 className="section-title">Meal API unavailable</h1><p className="section-subtitle">{error}</p><p className="small text-secondary mb-0">Sign in with a database-backed account. Demo browser sessions do not connect to MongoDB.</p><button className="btn-primary-custom mt-3" onClick={() => { setLoading(true); load(selectedDate, isManager); }}>Retry</button></div>;
  if (!data) return null;

  const myRow = data.members[0];
  return <>
    <div className="page-heading">
      <div><h1 className="page-title">{isManager ? "Meal control" : "My meal preferences"}</h1><p className="page-subtitle">{isManager ? "Choose a date and update each member's meals." : "Turn each meal ON or OFF. Your setting continues every day until you change it."}</p></div>
      {isManager && <div><label className="form-label small fw-semibold" htmlFor="meal-date">Select date</label><input id="meal-date" type="date" className="form-control" value={selectedDate} onChange={e => { setLoading(true); setSelectedDate(e.target.value); }} /></div>}
    </div>
    {error && <div className="alert alert-danger py-2 small">{error}</div>}
    {notice && <div className="alert alert-success py-2 small">{notice}</div>}
    {isManager ? <div className="card-clean section-card mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3"><div><h2 className="section-title">Member meals · {selectedDate}</h2><p className="section-subtitle mb-0">Changes apply only to the selected date, not future dates.</p></div><span className="badge-soft">Asia/Dhaka</span></div>
      <div className="table-wrap"><table className="table align-middle"><thead><tr><th>Member</th>{mealKeys.map(meal => <th key={meal}>{labels[meal]}</th>)}</tr></thead><tbody>
        {data.members.map(row => <tr key={row.user.id}><td><strong>{row.user.name}</strong><div className="small text-secondary">{row.user.email}</div></td>{mealKeys.map(meal => <td key={meal}><button disabled={saving} className={"btn btn-sm " + (row[meal] ? "btn-success" : "btn-outline-secondary")} onClick={() => updateMemberMeal(row.user.id, meal, !row[meal])}>{row[meal] ? "ON" : "OFF"}</button></td>)}</tr>)}
      </tbody></table>{data.members.length === 0 && <div className="empty-state">No active members found.</div>}</div>
    </div> : <div className="row g-3 mb-4">
      {mealKeys.map(meal => <div className="col-12 col-md-4" key={meal}><div className="card-clean stat-card h-100">
        <div className="d-flex align-items-center gap-2 mb-3"><span className="stat-icon"><i className={"bi " + (meal === "breakfast" ? "bi-sunrise" : meal === "lunch" ? "bi-sun" : "bi-moon-stars")} /></span><strong>{labels[meal]}</strong></div>
        <div className="stat-value">{myRow?.[meal] ? "ON" : "OFF"}</div><div className="stat-note mb-3">Recurring setting · applies every day</div>
        <div className="d-flex gap-2"><button disabled={saving || myRow?.[meal]} onClick={() => updateMyPreference(meal, true)} className="btn btn-success flex-fill">Turn ON</button><button disabled={saving || !myRow?.[meal]} onClick={() => updateMyPreference(meal, false)} className="btn btn-outline-secondary flex-fill">Turn OFF</button></div>
      </div></div>)}
    </div>}
    <div className="card-clean section-card"><h2 className="section-title mb-2">How meal counting works</h2><ul className="small text-secondary mb-0 ps-3"><li>Member ON/OFF settings repeat daily until changed.</li><li>Manager edits are saved for the selected date only.</li><li>A date-specific manager edit takes priority over the recurring setting for that date.</li><li>Breakfast, lunch and dinner are controlled independently.</li></ul></div>
  </>;
}
