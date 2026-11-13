"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveDemoSession } from "@/lib/demo-auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail === "manager@masshisab.demo" && password === "Manager@123") {
      saveDemoSession({ role: "Manager", name: "Demo Manager", email: normalizedEmail });
      router.push("/dashboard");
      return;
    }

    if (normalizedEmail === "member@masshisab.demo" && password === "Member@123") {
      saveDemoSession({ role: "Member", name: "Sakib Khan", email: normalizedEmail });
      router.push("/dashboard");
      return;
    }

    setError("Email or password is incorrect. Use one of the demo accounts below.");
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
          <div className="mb-4"><div className="text-uppercase fw-bold mb-2" style={{ fontSize: 10, letterSpacing: ".14em", color: "#176b52" }}>WELCOME BACK</div><h2>Sign in to your mess</h2><p className="text-secondary">Choose a demo role and enter its credentials.</p></div>
          <form onSubmit={submit}>
            <div className="mb-3"><label className="form-label">Email address</label><input required type="email" className="form-control" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} /></div>
            <div className="mb-2"><div className="d-flex justify-content-between"><label className="form-label">Password</label></div><div className="position-relative"><input required minLength={6} type={show ? "text" : "password"} className="form-control pe-5" placeholder="Enter your password" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} /><button type="button" onClick={() => setShow(!show)} className="btn position-absolute top-50 end-0 translate-middle-y text-secondary"><i className={"bi " + (show ? "bi-eye-slash" : "bi-eye")} /></button></div></div>
            {error && <div className="alert alert-danger py-2 small mt-3" role="alert">{error}</div>}
            <div className="d-flex align-items-center gap-2 my-4"><input className="form-check-input m-0" type="checkbox" id="remember" /><label htmlFor="remember" className="text-secondary small">Remember me</label></div>
            <button className="btn-primary-custom w-100 py-3" type="submit">Sign in <i className="bi bi-arrow-right ms-2" /></button>
          </form>
          <div className="card-clean p-3 mt-4">
            <strong className="d-block mb-2">Demo login credentials</strong>
            <div className="small mb-2"><strong>Moderator / Manager</strong><br />manager@masshisab.demo<br />Password: Manager@123</div>
            <hr className="my-2" />
            <div className="small"><strong>Member</strong><br />member@masshisab.demo<br />Password: Member@123</div>
          </div>
          <div className="text-center mt-4 auth-foot">New to Mass Hisab? <Link href="/register" className="fw-bold" style={{ color: "#176b52" }}>Create an account</Link></div>
          <div className="text-center mt-3 auth-foot">Demo mode — changes are temporary and stored in this browser session.</div>
        </div>
      </section>
    </main>
  );
}
