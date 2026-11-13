"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type Member = { _id?: string; id?: string; name: string; email: string; phone?: string; isActive?: boolean };
type MembersResponse = { members: Member[] };

export default function MembersControl() {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await apiRequest<MembersResponse>("/api/members");
      setMembers(result.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load members.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice(""); setTemporaryPassword("");
    try {
      const result = await apiRequest<{ member: Member; temporaryPassword?: string }>("/api/members", {
        method: "POST",
        body: JSON.stringify({ name, email, phone }),
      });
      setName(""); setEmail(""); setPhone("");
      setTemporaryPassword(result.temporaryPassword || "");
      setNotice("Member account created. Share the temporary password securely.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add member.");
    } finally {
      setSaving(false);
    }
  }

  async function updateMember(member: Member, patch: Partial<Member>) {
    const id = member._id || member.id;
    if (!id) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const result = await apiRequest<{ member: Member }>(`/api/members/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setMembers(current => current.map(item => (item._id || item.id) === id ? result.member : item));
      setNotice("Member information updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update member.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteMember(member: Member) {
    const id = member._id || member.id;
    if (!id || !window.confirm(`Remove ${member.name} from this mess?`)) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(`/api/members/${id}`, { method: "DELETE" });
      setNotice("Member deactivated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove member.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card-clean section-card">Loading members…</div>;
  if (error && members.length === 0) return <div className="card-clean section-card"><h1 className="section-title">Member API unavailable</h1><p className="section-subtitle">{error}</p><button className="btn-primary-custom mt-3" onClick={() => { setLoading(true); load(); }}>Retry</button></div>;

  return <>
    <div className="page-heading"><div><h1 className="page-title">Members</h1><p className="page-subtitle">Add, edit and remove member accounts in your mess.</p></div></div>
    {error && <div className="alert alert-danger py-2 small">{error}</div>}
    {notice && <div className="alert alert-success py-2 small">{notice}</div>}
    {temporaryPassword && <div className="alert alert-warning"><strong>Temporary password (shown once):</strong> <code>{temporaryPassword}</code><div className="small mt-1">Copy it and give it to the member. They should change it after signing in.</div></div>}
    <div className="card-clean section-card mb-4"><h2 className="section-title mb-3">Add a member</h2><form onSubmit={addMember}><div className="row g-2"><div className="col-md-4"><input required className="form-control" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} /></div><div className="col-md-4"><input required type="email" className="form-control" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} /></div><div className="col-md-3"><input className="form-control" placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} /></div><div className="col-md-1"><button disabled={saving} className="btn-primary-custom w-100" type="submit">Add</button></div></div></form></div>
    <div className="card-clean section-card"><h2 className="section-title mb-3">All members ({members.length})</h2><div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Action</th></tr></thead><tbody>
      {members.map(member => <tr key={member._id || member.id}><td><input aria-label="Member name" className="form-control form-control-sm" defaultValue={member.name} onBlur={event => { if (event.target.value.trim() && event.target.value !== member.name) updateMember(member, { name: event.target.value.trim() }); }} /></td><td><input aria-label="Member email" type="email" className="form-control form-control-sm" defaultValue={member.email} onBlur={event => { if (event.target.value.trim() && event.target.value !== member.email) updateMember(member, { email: event.target.value.trim() }); }} /></td><td><input aria-label="Member phone" className="form-control form-control-sm" defaultValue={member.phone || ""} onBlur={event => { if (event.target.value !== (member.phone || "")) updateMember(member, { phone: event.target.value }); }} /></td><td><button disabled={saving} className="btn btn-sm btn-outline-danger" onClick={() => deleteMember(member)}>Delete</button></td></tr>)}
    </tbody></table>{members.length === 0 && <div className="empty-state">No members yet. Add your first member above.</div>}</div></div>
  </>;
}
