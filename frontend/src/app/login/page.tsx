"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveDemoSession } from "@/lib/demo-auth";
import { apiRequest } from "@/lib/api";

type LoginResult = { user: { id: string; messId: string; name: string; email: string; role: "Manager" | "Member" } };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [messId, setMessId] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const normalizedEmail = email.trim().toLowerCase();

    // Demo credentials are intentionally checked before the API request.
    // The supplied demo email is not a complete RFC email address, so this
    // exact demo-only value is accepted by the text input below.
    if (normalizedEmail === "rajiurrahman2003@gmail" && password === "123456") {
      saveDemoSession({ role: "Manager", name: "Demo Moderator", email: normalizedEmail, authMode: "demo" });
      router.push("/dashboard");
      setLoading(false);
      return;
    }
    if (normalizedEmail === "rajiurrahman2003@gmail" && password === "654321") {
      saveDemoSession({ role: "Member", name: "Demo User", email: normalizedEmail, authMode: "demo" });
      router.push("/dashboard");
      setLoading(false);
      return;
    }

    try {
      const result = await apiRequest<LoginResult>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: normalizedEmail, password, ...(messId.trim() ? { messId: messId.trim() } : {}) }),
      });
      saveDemoSession({ id: result.user.id, messId: result.user.messId, role: result.user.role, name: result.user.name, email: result.user.email, authMode: "api" });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <Link href="/login" className="brand text-white p-0">
          <span className="brand-mark" style={{ background: "#fff", color: "#176b52" }}><i className="bi bi-house-heart-fill" /></span>
          <span><span className="brand-name d-block">Mass Hisab</span><span className="brand-sub d-block text-white-50">Mess, made simple</span></span>
        </Link>
        <div className="auth-copy">
          <span className="badge rounded-pill px-3 py-2 mb-4" style={{ background: "rgba(255,255,255,.12)", color: "#d6eee2" }}>SMART MESS MANAGEMENT</span>
          <h1>Good living starts with clear হিসাব.</h1>
          <p>Meals, bazar, deposits and monthly accounts — everything your mess needs, together in one calm workspace.</p>
          <div className="d-flex gap-4 mt-4"><div><div className="fw-bold fs-4">01</div><small className="text-white-50">Track meals</small></div><div><div className="fw-bold fs-4">02</div><small className="text-white-50">Share costs</small></div><div><div className="fw-bold fs-4">03</div><small className="text-white-50">Stay clear</small></div></div>
        </div>
        <small className="text-white-50">© 2026 Mass Hisab. Built for better shared living.</small>
      </section>
      <section className="auth-form-side">
        <div className="auth-form">
          <div className="mb-4"><div className="text-uppercase fw-bold mb-2" style={{ fontSize: 10, letterSpacing: ".14em", color: "#176b52" }}>WELCOME BACK</div><h2>Sign in to your mess</h2><p className="text-secondary">Use your mess account credentials.</p></div>
          <form onSubmit={submit}>
            <div className="mb-3"><label className="form-label">Email address</label><input required type="text" inputMode="email" autoComplete="username" className="form-control" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} /></div>
            <div className="mb-3"><label className="form-label">Mess ID (optional)</label><input className="form-control" placeholder="Required only if your email is used in multiple messes" value={messId} onChange={e => { setMessId(e.target.value); setError(""); }} /></div>
            <div className="mb-2"><label className="form-label">Password</label><div className="position-relative"><input required type={show ? "text" : "password"} className="form-control pe-5" placeholder="Enter your password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} /><button type="button" onClick={() => setShow(!show)} className="btn position-absolute top-50 end-0 translate-middle-y text-secondary"><i className={"bi " + (show ? "bi-eye-slash" : "bi-eye")} /></button></div></div>
            {error && <div className="alert alert-danger py-2 small mt-3" role="alert">{error}</div>}
            <button disabled={loading} className="btn-primary-custom w-100 py-3 mt-4" type="submit">{loading ? "Signing in…" : "Sign in"} <i className="bi bi-arrow-right ms-2" /></button>
          </form>
          <div className="card-clean p-3 mt-4">
            <strong className="d-block mb-2">Demo login credentials</strong>
            <div className="small mb-2"><strong>Moderator</strong><br />rajiurrahman2003@gmail<br />Password: 123456</div>
            <hr className="my-2" />
            <div className="small"><strong>User</strong><br />rajiurrahman2003@gmail<br />Password: 654321</div>
            <div className="small text-secondary mt-2">Demo access only. These credentials do not authenticate against the production database.</div>
          </div>
          <div className="text-center mt-4 auth-foot">New to Mass Hisab? <Link href="/register" className="fw-bold" style={{ color: "#176b52" }}>Create an account</Link></div>
        </div>
      </section>
    </main>
  );
}
