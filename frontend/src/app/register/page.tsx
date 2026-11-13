"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { saveDemoSession } from "@/lib/demo-auth";

type RegisterResult = { user: { id: string; messId: string; name: string; email: string; role: "Manager" | "Member" } };

export default function RegisterPage() {
  const router = useRouter();
  const [mess, setMess] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<RegisterResult>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ messName: mess, name, email, phone, password }),
      });
      saveDemoSession({ id: result.user.id, messId: result.user.messId, role: result.user.role, name: result.user.name, email: result.user.email, authMode: "api" });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create the mess.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth-page"><section className="auth-visual"><Link href="/login" className="brand text-white p-0"><span className="brand-mark" style={{ background: "#fff", color: "#176b52" }}><i className="bi bi-house-heart-fill" /></span><span><span className="brand-name d-block">Mass Hisab</span><span className="brand-sub d-block text-white-50">Mess, made simple</span></span></Link><div className="auth-copy"><span className="badge rounded-pill px-3 py-2 mb-4" style={{ background: "rgba(255,255,255,.12)", color: "#d6eee2" }}>A BETTER WAY TO LIVE TOGETHER</span><h1>One mess. One clear হিসাব.</h1><p>Create your mess workspace and bring your members, meals and monthly expenses into one shared place.</p></div><small className="text-white-50">© 2026 Mass Hisab</small></section><section className="auth-form-side"><div className="auth-form"><div className="mb-4"><div className="text-uppercase fw-bold mb-2" style={{ fontSize: 10, letterSpacing: ".14em", color: "#176b52" }}>GET STARTED</div><h2>Create your mess</h2><p className="text-secondary">You will become the first moderator.</p></div><form onSubmit={submit}><div className="mb-3"><label className="form-label">Mess name</label><input required className="form-control" placeholder="e.g. Green View Mess" value={mess} onChange={e => setMess(e.target.value)} /></div><div className="mb-3"><label className="form-label">Your full name</label><input required className="form-control" placeholder="Enter your name" value={name} onChange={e => setName(e.target.value)} /></div><div className="mb-3"><label className="form-label">Email address</label><input required type="email" className="form-control" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /></div><div className="mb-3"><label className="form-label">Phone (optional)</label><input className="form-control" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} /></div><div className="mb-4"><label className="form-label">Create password</label><input required minLength={8} type="password" className="form-control" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} /></div>{error && <div className="alert alert-danger py-2 small">{error}</div>}<button disabled={loading} className="btn-primary-custom w-100 py-3" type="submit">{loading ? "Creating workspace…" : "Create workspace"} <i className="bi bi-arrow-right ms-2" /></button></form><div className="text-center mt-4 auth-foot">Already have an account? <Link href="/login" className="fw-bold" style={{ color: "#176b52" }}>Sign in</Link></div></div></section></main>;
}
