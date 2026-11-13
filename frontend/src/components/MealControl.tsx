"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { readDemoSession } from "@/lib/demo-auth";

type MealKey = "breakfast" | "lunch" | "dinner";
type MealRow = { user: { id: string; name: string; email: string; phone?: string }; breakfast: boolean; lunch: boolean; dinner: boolean; hasDateOverride?: boolean };
type MealRequest = { id: string; user: { id: string; name: string; email: string }; meal: MealKey; enabled: boolean; status: "Pending" | "Approved" | "Rejected"; createdAt: string };
type MealData = { date: string; timezone: string; currentTime?: string; deadline?: string; requestOpen?: boolean; members: MealRow[]; requests: MealRequest[] };
type SummaryMember = { user: { id: string; name: string; email: string }; breakfast: boolean; lunch: boolean; dinner: boolean; total: number };
type SummaryDay = { date: string; members: SummaryMember[]; totals: { breakfast: number; lunch: number; dinner: number; meals: number } };
const labels: Record<MealKey, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };
const mealKeys: MealKey[] = ["breakfast", "lunch", "dinner"];
const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export default function MealControl() {
  const [data, setData] = useState<MealData | null>(null);
  const [role, setRole] = useState<"Manager" | "Member" | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [selectedMonth, setSelectedMonth] = useState(todayKey().slice(0, 7));
  const [summary, setSummary] = useState<SummaryDay[]>([]);
  const [summaryError, setSummaryError] = useState("");
  const [editingUserId, setEditingUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isManager = role === "Manager";
  const load = useCallback(async (date: string, manager: boolean) => {
    setError("");
    try {
      const result = await apiRequest<MealData & { success: boolean }>(manager ? "/api/meals/date/" + date : "/api/meals/today");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load meal information.");
    } finally { setLoading(false); }
  }, []);

  const loadSummary = useCallback(async (month: string) => {
    setSummaryError("");
    try {
      const result = await apiRequest<{ days: SummaryDay[] }>("/api/meals/summary/" + month);
      setSummary(result.days || []);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Unable to load the monthly meal ledger.");
    }
  }, []);

  useEffect(() => {
    const currentRole = readDemoSession()?.role || null;
    setRole(currentRole);
    load(selectedDate, currentRole === "Manager");
  }, [load, selectedDate]);

  useEffect(() => {
    if (role) loadSummary(selectedMonth);
  }, [loadSummary, role, selectedMonth]);

  async function perform(action: () => Promise<unknown>, message: string) {
    setSaving(true); setError(""); setNotice("");
    try {
      await action();
      setNotice(message);
      await load(selectedDate, isManager);
      if (role) await loadSummary(selectedMonth);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save this change."); }
    finally { setSaving(false); }
  }

  function updateMemberMeal(userId: string, meal: MealKey, enabled: boolean) {
    return perform(
      () => apiRequest("/api/meals/" + userId + "/date/" + selectedDate, { method: "PATCH", body: JSON.stringify({ meal, enabled }) }),
      labels[meal] + " updated for " + selectedDate + "."
    );
  }

  function updateMyPreference(meal: MealKey, enabled: boolean) {
    return perform(
      () => apiRequest("/api/meals/preferences", { method: "PUT", body: JSON.stringify({ [meal]: enabled }) }),
      labels[meal] + " recurring setting turned " + (enabled ? "ON" : "OFF") + "."
    );
  }

  if (loading) return <div className="card-clean section-card">Loading meal information…</div>;
  if (error && !data) return <div className="card-clean section-card"><h1 className="section-title">Meal API unavailable</h1><p className="section-subtitle">{error}</p><p className="small text-secondary mb-0">This screen requires a database-backed account. Demo browser sessions do not connect to MongoDB.</p><button className="btn-primary-custom mt-3" onClick={() => { setLoading(true); load(selectedDate, isManager); }}>Retry</button></div>;
  if (!data) return null;

  const myRow = data.members[0];
  return <>
    <div className="page-heading">
      <div><h1 className="page-title">{isManager ? "Meal control" : "My meal preferences"}</h1><p className="page-subtitle">{isManager ? "Choose a date, review each member's meal count and edit their meals." : "Turn each meal ON or OFF. Your setting continues every day until you change it."}</p></div>
      {isManager && <div><label className="form-label small fw-semibold" htmlFor="meal-date">Select date</label><input id="meal-date" type="date" className="form-control" value={selectedDate} onChange={e => { setLoading(true); setSelectedDate(e.target.value); }} /></div>}
    </div>
    {error && <div className="alert alert-danger py-2 small">{error}</div>}
    {notice && <div className="alert alert-success py-2 small">{notice}</div>}
    {isManager ? <>
      <div className="card-clean section-card mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3"><div><h2 className="section-title">Member meals · {selectedDate}</h2><p className="section-subtitle mb-0">Use Edit to change a member's breakfast, lunch or dinner for this date.</p></div><span className="badge-soft">Asia/Dhaka</span></div>
        <div className="table-wrap"><table className="table align-middle"><thead><tr><th>Member</th>{mealKeys.map(meal => <th key={meal}>{labels[meal]}</th>)}<th>Total</th><th>Action</th></tr></thead><tbody>
          {data.members.map(row => <tr key={row.user.id}><td><strong>{row.user.name}</strong><div className="small text-secondary">{row.user.email}</div></td>{mealKeys.map(meal => <td key={meal}>{editingUserId === row.user.id ? <button disabled={saving} className={"btn btn-sm " + (row[meal] ? "btn-success" : "btn-outline-secondary")} onClick={() => updateMemberMeal(row.user.id, meal, !row[meal])}>{row[meal] ? "ON" : "OFF"}</button> : <span className={"badge-soft " + (row[meal] ? "" : "badge-warn")}>{row[meal] ? "ON" : "OFF"}</span>}</td>)}<td className="fw-bold">{Number(row.breakfast) + Number(row.lunch) + Number(row.dinner)} / 3</td><td><button disabled={saving} className="btn btn-sm btn-outline-primary" onClick={() => setEditingUserId(editingUserId === row.user.id ? "" : row.user.id)}>{editingUserId === row.user.id ? "Done" : "Edit"}</button></td></tr>)}
        </tbody></table>{data.members.length === 0 && <div className="empty-state">No active members found.</div>}</div>
        <div className="small text-secondary mt-2">Total shows how many of the three meals are ON for the selected date. Moderator changes are saved immediately.</div>
      </div>
      <div className="card-clean section-card mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-3"><div><h2 className="section-title">Date-wise meal history</h2><p className="section-subtitle mb-0">See each member's breakfast, lunch, dinner and total meals for every day.</p></div><div><label className="form-label small fw-semibold" htmlFor="meal-month">Select month</label><input id="meal-month" type="month" className="form-control" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} /></div></div>
        {summaryError && <div className="alert alert-warning py-2 small">{summaryError}</div>}
        <div className="table-wrap"><table className="table table-sm align-middle"><thead><tr><th>Date</th><th>Member</th><th>Breakfast</th><th>Lunch</th><th>Dinner</th><th>Total</th></tr></thead><tbody>
          {summary.flatMap(day => day.members.map(member => <tr key={day.date + "-" + member.user.id}><td className="text-nowrap">{day.date}</td><td>{member.user.name}</td><td>{member.breakfast ? "1" : "0"}</td><td>{member.lunch ? "1" : "0"}</td><td>{member.dinner ? "1" : "0"}</td><td className="fw-bold">{member.total}</td></tr>))}
        </tbody></table>{summary.length === 0 && !summaryError && <div className="empty-state">No meal history found for this month.</div>}</div>
        <div className="small text-secondary mt-2">Daily total across the mess: {summary.reduce((sum, day) => sum + day.totals.meals, 0)} meals for this month.</div>
      </div>
    </> : <>
      <div className="row g-3 mb-4">
        {mealKeys.map(meal => <div className="col-12 col-md-4" key={meal}><div className="card-clean stat-card h-100">
          <div className="d-flex align-items-center gap-2 mb-3"><span className="stat-icon"><i className={"bi " + (meal === "breakfast" ? "bi-sunrise" : meal === "lunch" ? "bi-sun" : "bi-moon-stars")} /></span><strong>{labels[meal]}</strong></div>
          <div className="stat-value">{myRow?.[meal] ? "ON" : "OFF"}</div><div className="stat-note mb-3">Recurring setting · applies every day</div>
          <div className="d-flex gap-2"><button disabled={saving || myRow?.[meal]} onClick={() => updateMyPreference(meal, true)} className="btn btn-success flex-fill">Turn ON</button><button disabled={saving || !myRow?.[meal]} onClick={() => updateMyPreference(meal, false)} className="btn btn-outline-secondary flex-fill">Turn OFF</button></div>
        </div></div>)}
      </div>
      <div className="card-clean section-card"><h2 className="section-title mb-2">How meal counting works</h2><ul className="small text-secondary mb-0 ps-3"><li>Member ON/OFF settings repeat daily until changed.</li><li>Manager edits are saved for the selected date only.</li><li>A date-specific manager edit takes priority over the recurring setting for that date.</li><li>Breakfast, lunch and dinner are controlled independently.</li></ul></div>
    </>}
  </>;
}
