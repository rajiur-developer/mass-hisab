"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { readDemoSession, type DemoSession } from "@/lib/demo-auth";
import MealControl from "@/components/MealControl";
import MembersControl from "@/components/MembersControl";
import BazarControl from "@/components/BazarControl";
import ManagerRotationControl from "@/components/ManagerRotationControl";

type MealName = "Breakfast" | "Lunch" | "Dinner";
type MemberRecord = { id: string; name: string; email: string; phone: string; breakfast: boolean; lunch: boolean; dinner: boolean };
type MealRequest = { id: string; member: string; meal: MealName; requested: boolean; status: "Pending" | "Approved" | "Rejected" };
const MEAL_KEY = "mass-hisab-meal-demo";
const MEMBERS_KEY = "mass-hisab-members-demo";
const DEADLINE_KEY = "mass-hisab-request-deadline";
const RECORDS_KEY = "mass-hisab-records-demo";

const initialMembers: MemberRecord[] = [
  { id: "m1", name: "Abir Rahman", email: "abir@example.com", phone: "01712-000001", breakfast: true, lunch: true, dinner: true },
  { id: "m2", name: "Sakib Khan", email: "member@masshisab.demo", phone: "01712-000002", breakfast: true, lunch: true, dinner: false },
  { id: "m3", name: "Tanvir Noor", email: "tanvir@example.com", phone: "01712-000003", breakfast: true, lunch: false, dinner: true },
  { id: "m4", name: "Mahin Hasan", email: "mahin@example.com", phone: "01712-000004", breakfast: true, lunch: true, dinner: true }
];

const configs: Record<string, { title: string; subtitle: string; columns: string[]; rows: string[][] }> = {
  bazar: { title: "Bazar & shopping", subtitle: "Mess-wide market purchases.", columns: ["Item", "Purchased by", "Date", "Amount"], rows: [["Vegetables & groceries", "Sakib Khan", "Nov 14, 2026", "৳ 850"], ["Rice · 10 kg", "Abir Rahman", "Nov 12, 2026", "৳ 720"]] },
  deposits: { title: "Deposits", subtitle: "Your contributions and verified payments.", columns: ["Member", "Date", "Method", "Amount"], rows: [["Sakib Khan", "Nov 12, 2026", "Cash", "৳ 1,500"], ["Sakib Khan", "Nov 02, 2026", "bKash", "৳ 1,500"]] },
  expenses: { title: "Shared expenses", subtitle: "Utilities and shared mess costs.", columns: ["Expense", "Category", "Date", "Amount"], rows: [["Monthly Wi-Fi bill", "Internet", "Nov 05, 2026", "৳ 1,200"], ["Water bill", "Utilities", "Nov 03, 2026", "৳ 650"]] },
  reports: { title: "Monthly report", subtitle: "Your meal count, meal cost, deposits and balance.", columns: ["Member", "Meals", "Meal cost", "Deposits", "Balance"], rows: [["Sakib Khan", "64", "৳ 4,384", "৳ 3,000", "-৳ 1,624"]] },
  manager: { title: "Manager rotation", subtitle: "Monthly moderator handover.", columns: ["Manager", "Start date", "End date"], rows: [["Abir Rahman", "Nov 01, 2026", "Nov 30, 2026"]] },
  settings: { title: "Mess settings", subtitle: "Manage mess preferences.", columns: ["Setting", "Current value"], rows: [["Mess name", "Green View Mess"], ["Timezone", "Asia/Dhaka"]] }
};

export default function SectionPage() {
  const params = useParams<{ section: string }>();
  const section = params.section;
  const config = useMemo(() => configs[section] || configs.reports, [section]);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [members, setMembers] = useState<MemberRecord[]>(initialMembers);
  const [requests, setRequests] = useState<MealRequest[]>([]);
  const [recordRows, setRecordRows] = useState<Record<string, string[][]>>({});
  const [deadline, setDeadline] = useState("20:00");
  const [now, setNow] = useState("");
  const [notice, setNotice] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    setSession(readDemoSession());
    const savedMembers = sessionStorage.getItem(MEMBERS_KEY);
    const savedMeals = sessionStorage.getItem(MEAL_KEY);
    const savedDeadline = sessionStorage.getItem(DEADLINE_KEY);
    const savedRecords = sessionStorage.getItem(RECORDS_KEY);
    if (savedMembers) setMembers(JSON.parse(savedMembers));
    if (savedMeals) setRequests(JSON.parse(savedMeals));
    if (savedDeadline) setDeadline(savedDeadline);
    if (savedRecords) setRecordRows(JSON.parse(savedRecords));
    const updateClock = () => setNow(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Dhaka" }).format(new Date()));
    updateClock();
    const timer = window.setInterval(updateClock, 30000);
    return () => window.clearInterval(timer);
  }, []);

  if (section === "meals") return <MealControl />;
  if (section === "members") return <MembersControl />;
  if (section === "bazar") return <BazarControl />;
  if (section === "manager") return <ManagerRotationControl />;

  const isManager = session?.role === "Manager";
  const currentMember = members.find(m => m.email === session?.email) || members[1];
  const isBeforeDeadline = !now || now < deadline;
  if (!session) return <div className="card-clean section-card">Loading your account…</div>;
  if (session.role === "Member" && !["meals", "deposits", "reports"].includes(section)) {
    return <div className="card-clean section-card"><h1 className="section-title">Access restricted</h1><p className="section-subtitle mb-0">Members can access only their own overview, meal requests, deposits and monthly report. Ask the moderator if you need another section.</p></div>;
  }

  const meals: { key: "breakfast" | "lunch" | "dinner"; label: MealName; icon: string }[] = [
    { key: "breakfast", label: "Breakfast", icon: "bi-sunrise" },
    { key: "lunch", label: "Lunch", icon: "bi-sun" },
    { key: "dinner", label: "Dinner", icon: "bi-moon-stars" }
  ];

  function saveMembers(next: MemberRecord[]) {
    setMembers(next);
    sessionStorage.setItem(MEMBERS_KEY, JSON.stringify(next));
  }
  function saveRequests(next: MealRequest[]) {
    setRequests(next);
    sessionStorage.setItem(MEAL_KEY, JSON.stringify(next));
  }
  function saveRecordRows(next: Record<string, string[][]>) {
    setRecordRows(next);
    sessionStorage.setItem(RECORDS_KEY, JSON.stringify(next));
  }
  function editRecordCell(rowIndex: number, cellIndex: number, value: string) {
    const rows = (recordRows[section] || config.rows).map(row => [...row]);
    rows[rowIndex][cellIndex] = value;
    saveRecordRows({ ...recordRows, [section]: rows });
  }
  function saveDeadline(value: string) {
    setDeadline(value);
    sessionStorage.setItem(DEADLINE_KEY, value);
    setNotice("All members' request deadline has been updated.");
  }
  function sendRequest(meal: MealName, requested: boolean) {
    if (!isBeforeDeadline) return;
    const existing = requests.find(r => r.member === currentMember.name && r.meal === meal && r.status === "Pending");
    if (existing) {
      setNotice("You already have a pending request for this meal.");
      return;
    }
    saveRequests([...requests, { id: Date.now().toString(), member: currentMember.name, meal, requested, status: "Pending" }]);
    setNotice(meal + " " + (requested ? "ON" : "OFF") + " request sent to the moderator.");
  }
  function decideRequest(id: string, status: "Approved" | "Rejected") {
    const request = requests.find(r => r.id === id);
    if (!request) return;
    saveRequests(requests.map(r => r.id === id ? { ...r, status } : r));
    if (status === "Approved") {
      const key = request.meal === "Breakfast" ? "breakfast" : request.meal === "Lunch" ? "lunch" : "dinner";
      saveMembers(members.map(m => m.name === request.member ? { ...m, [key]: request.requested } : m));
    }
    setNotice("Request " + status.toLowerCase() + ".");
  }
  function toggleMeal(memberId: string, key: "breakfast" | "lunch" | "dinner") {
    saveMembers(members.map(m => m.id === memberId ? { ...m, [key]: !m[key] } : m));
  }
  function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    saveMembers([...members, { id: Date.now().toString(), name: newName.trim(), email: newEmail.trim(), phone: newPhone.trim(), breakfast: false, lunch: false, dinner: false }]);
    setNewName(""); setNewEmail(""); setNewPhone("");
    setNotice("Member added to this demo session.");
  }
  function deleteMember(id: string) {
    const target = members.find(m => m.id === id);
    if (!target || target.email === "manager@masshisab.demo") return;
    saveMembers(members.filter(m => m.id !== id));
    setNotice("Member removed from this demo session.");
  }

  if (section === "meals") return <>
    <div className="page-heading"><div><h1 className="page-title">{isManager ? "Daily meal control" : "My meal requests"}</h1><p className="page-subtitle">{isManager ? "Manage breakfast, lunch and dinner for every member." : "Choose ON or OFF for each meal before the common deadline."}</p></div></div>
    {notice && <div className="alert alert-info py-2 small">{notice}<button className="btn-close float-end" onClick={() => setNotice("")} /></div>}
    <div className="card-clean section-card mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3"><div><h2 className="section-title">Daily request deadline</h2><p className="section-subtitle mb-0">{isManager ? "Set one cutoff time for all members and all three meals." : "All three meal requests close at this moderator-set time."}</p></div>
        {isManager ? <div className="d-flex align-items-center gap-2"><input aria-label="Request deadline" type="time" className="form-control" value={deadline} onChange={e => setDeadline(e.target.value)} /><button className="btn-primary-custom" onClick={() => saveDeadline(deadline)}>Save time</button></div> : <div className="text-end"><div className="fw-bold fs-5">{deadline}</div><span className={"badge-soft " + (isBeforeDeadline ? "" : "badge-warn")}>{isBeforeDeadline ? "Requests open" : "Requests closed"}</span></div>}
      </div>
    </div>
    {isManager ? <div className="card-clean section-card mb-4"><h2 className="section-title mb-3">All members · today</h2><div className="table-wrap"><table className="table"><thead><tr><th>Member</th>{meals.map(m => <th key={m.key}>{m.label}</th>)}</tr></thead><tbody>{members.map(member => <tr key={member.id}><td><strong>{member.name}</strong></td>{meals.map(meal => <td key={meal.key}><button className={"btn btn-sm " + (member[meal.key] ? "btn-success" : "btn-outline-secondary")} onClick={() => toggleMeal(member.id, meal.key)}>{member[meal.key] ? "ON" : "OFF"}</button></td>)}</tr>)}</tbody></table></div><p className="small text-secondary mb-0">Moderator can directly change any member's meal status.</p></div> : <div className="row g-3 mb-4">{meals.map(meal => <div className="col-12 col-md-4" key={meal.key}><div className="card-clean stat-card h-100"><div className="d-flex align-items-center gap-2 mb-3"><span className="stat-icon"><i className={"bi " + meal.icon} /></span><strong>{meal.label}</strong></div><div className="stat-value">{currentMember[meal.key] ? "ON" : "OFF"}</div><div className="stat-note mb-3">Current approved status</div><div className="d-flex gap-2"><button disabled={!isBeforeDeadline} onClick={() => sendRequest(meal.label, true)} className="btn btn-success flex-fill">Request ON</button><button disabled={!isBeforeDeadline} onClick={() => sendRequest(meal.label, false)} className="btn btn-outline-secondary flex-fill">Request OFF</button></div></div></div>)}</div>}
    <div className="card-clean section-card"><h2 className="section-title mb-3">{isManager ? "Member requests" : "My request history"}</h2><div className="table-wrap"><table className="table"><thead><tr>{isManager && <th>Member</th>}<th>Meal</th><th>Request</th><th>Status</th>{isManager && <th>Action</th>}</tr></thead><tbody>{requests.filter(r => isManager || r.member === currentMember.name).map(r => <tr key={r.id}>{isManager && <td>{r.member}</td>}<td>{r.meal}</td><td>{r.requested ? "ON" : "OFF"}</td><td><span className={"badge-soft " + (r.status === "Pending" ? "badge-warn" : "")}>{r.status}</span></td>{isManager && <td>{r.status === "Pending" ? <div className="d-flex gap-2"><button className="btn btn-sm btn-success" onClick={() => decideRequest(r.id, "Approved")}>Approve</button><button className="btn btn-sm btn-outline-danger" onClick={() => decideRequest(r.id, "Rejected")}>Reject</button></div> : "—"}</td>}</tr>)}</tbody></table>{requests.filter(r => isManager || r.member === currentMember.name).length === 0 && <div className="empty-state">No meal requests yet.</div>}</div></div>
  </>;

  if (section === "members") return <><div className="page-heading"><div><h1 className="page-title">Members</h1><p className="page-subtitle">Add, review and remove members from this mess.</p></div></div>{notice && <div className="alert alert-info py-2 small">{notice}</div>}<div className="card-clean section-card mb-4"><h2 className="section-title mb-3">Add a member</h2><form onSubmit={addMember}><div className="row g-2"><div className="col-md-4"><input required className="form-control" placeholder="Full name" value={newName} onChange={e => setNewName(e.target.value)} /></div><div className="col-md-4"><input required type="email" className="form-control" placeholder="Email address" value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div><div className="col-md-3"><input className="form-control" placeholder="Phone (optional)" value={newPhone} onChange={e => setNewPhone(e.target.value)} /></div><div className="col-md-1"><button className="btn-primary-custom w-100" type="submit">Add</button></div></div></form></div><div className="card-clean section-card"><h2 className="section-title mb-3">All members ({members.length})</h2><div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Meals today</th><th>Action</th></tr></thead><tbody>{members.map(m => <tr key={m.id}><td><input aria-label="Member name" className="form-control form-control-sm" value={m.name} onChange={e => saveMembers(members.map(item => item.id === m.id ? { ...item, name: e.target.value } : item))} /></td><td>{m.email}</td><td><input aria-label="Member phone" className="form-control form-control-sm" value={m.phone} onChange={e => saveMembers(members.map(item => item.id === m.id ? { ...item, phone: e.target.value } : item))} /></td><td>{[m.breakfast, m.lunch, m.dinner].filter(Boolean).length}/3</td><td><button disabled={m.email === "manager@masshisab.demo"} className="btn btn-sm btn-outline-danger" onClick={() => deleteMember(m.id)}>Delete</button></td></tr>)}</tbody></table></div></div></>;

  const baseRows = config.rows;
  const allRows = recordRows[section] || baseRows;
  const visibleRows = !isManager ? allRows.filter(row => row[0] === currentMember.name) : allRows;
  return <><div className="page-heading"><div><h1 className="page-title">{isManager ? config.title : "My " + config.title.toLowerCase()}</h1><p className="page-subtitle">{isManager ? config.subtitle : "Only your own account information is shown here."}</p></div></div><div className="card-clean section-card"><h2 className="section-title mb-3">{isManager ? "All records" : "My records"}</h2><div className="table-wrap"><table className="table"><thead><tr>{config.columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{visibleRows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{isManager ? <input aria-label={config.columns[j] + " for row " + (i + 1)} className="form-control form-control-sm" value={cell} onChange={e => editRecordCell(i, j, e.target.value)} /> : j === 0 ? <strong>{cell}</strong> : cell}</td>)}</tr>)}</tbody></table>{visibleRows.length === 0 && <div className="empty-state">No records found for your account.</div>}</div></div><p className="small text-secondary mt-3">Demo data only. Changes are kept in this browser session; backend persistence will be added later.</p></>;
}
