"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearDemoSession, readDemoSession, type DemoSession } from "@/lib/demo-auth";
import { apiRequest } from "@/lib/api";

const managerGroups = [
  { label: "Workspace", items: [["/dashboard", "Overview", "bi-grid-1x2"], ["/dashboard/meals", "Daily meals", "bi-calendar2-check"], ["/dashboard/members", "Members", "bi-people"], ["/dashboard/bazar", "Bazar & shopping", "bi-basket2"]] },
  { label: "Finance", items: [["/dashboard/deposits", "Deposits", "bi-wallet2"], ["/dashboard/expenses", "Expenses", "bi-receipt"], ["/dashboard/reports", "Monthly reports", "bi-bar-chart-line"]] },
  { label: "Manage", items: [["/dashboard/manager", "Manager rotation", "bi-arrow-left-right"], ["/dashboard/settings", "Mess settings", "bi-gear"]] }
];
const memberGroups = [
  { label: "My mess", items: [["/dashboard", "My overview", "bi-grid-1x2"], ["/dashboard/meals", "My meal requests", "bi-calendar2-check"], ["/dashboard/deposits", "My deposits", "bi-wallet2"], ["/dashboard/reports", "My monthly report", "bi-bar-chart-line"]] }
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<DemoSession | null>(null);

  useEffect(() => {
    setSession(readDemoSession());
  }, []);

  const isManager = session?.role === "Manager";
  const groups = isManager ? managerGroups : memberGroups;

  async function logout() {
    if (session?.authMode === "api") {
      try { await apiRequest("/api/auth/logout", { method: "POST" }); } catch { /* Clear the local session even if the API is offline. */ }
    }
    clearDemoSession();
    window.location.replace("/login");
  }

  return <div className="app-shell">
    {open && <button aria-label="Close menu" onClick={() => setOpen(false)} className="position-fixed top-0 start-0 w-100 h-100 border-0 bg-dark bg-opacity-25 d-lg-none" style={{ zIndex: 25 }} />}
    <aside className={"sidebar " + (open ? "open" : "")}>
      <Link href="/dashboard" className="brand" onClick={() => setOpen(false)}><span className="brand-mark"><i className="bi bi-house-heart-fill" /></span><span><span className="brand-name d-block">Mass Hisab</span><span className="brand-sub d-block">Mess, made simple</span></span></Link>
      {groups.map(g => <div className="mb-2" key={g.label}><div className="nav-caption">{g.label}</div>{g.items.map(([href, label, icon]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={"side-link " + ((href === "/dashboard" ? path === href : path.startsWith(href)) ? "active" : "")}><i className={"bi " + icon} /><span>{label}</span></Link>)}</div>)}
      <div className="sidebar-bottom"><div className="d-flex align-items-center gap-2 mb-2"><span className="stat-icon"><i className="bi bi-shield-check" /></span><strong style={{ fontSize: 12 }}>{isManager ? "Moderator access" : "Member access"}</strong></div><p className="mb-0 text-secondary" style={{ fontSize: 11, lineHeight: 1.6 }}>{isManager ? "You can review and manage mess-wide information." : "You can view your own account and send meal requests."}</p></div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="d-flex align-items-center gap-3"><button className="btn btn-light border mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><i className="bi bi-list fs-5" /></button><div><div className="fw-bold" style={{ fontSize: 13 }}>Green View Mess</div><div className="text-secondary" style={{ fontSize: 10 }}>Mirpur, Dhaka · November 2026</div></div></div>
        <div className="d-flex align-items-center gap-2"><div className="avatar">{(session?.name || "Demo").split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase()}</div><div className="d-none d-sm-block"><div className="fw-bold" style={{ fontSize: 12 }}>{session?.name || "Demo account"}</div><div className="text-secondary" style={{ fontSize: 10 }}>{session?.role === "Manager" ? "Moderator" : session?.role || "Loading role"}</div></div><button onClick={logout} className="btn btn-light border btn-sm ms-2" title="Sign out"><i className="bi bi-box-arrow-right" /> <span className="d-none d-md-inline">Logout</span></button></div>
      </header>
      <div className="content-wrap">{children}</div>
    </main>
  </div>;
}
