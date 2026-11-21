"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import "../student-portal.css";

export default function StudentLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("student.demo");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch("/api/student-session", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({action:"login",username,password}), cache:"no-store",
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "Không thể đăng nhập.");
      setPassword(""); router.replace("/student/dashboard"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Có lỗi xảy ra."); }
    finally { setBusy(false); }
  }
  return <main className="student-portal student-login-page">
    <section className="student-panel student-login-panel">
      <p className="student-kicker">EDUINSIGHT AI · MÔ PHỎNG</p>
      <h1>Đăng nhập cổng sinh viên</h1>
      <p>Hồ sơ học tập demo · Trần Thế Phúc · Ngành Công nghệ thông tin.</p>
      <form onSubmit={submit} className="student-form">
        <label>Tên đăng nhập<input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={80}/></label>
        <label>Mật khẩu<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required maxLength={256}/></label>
        {error && <p role="alert" className="student-error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Đang xác thực..." : "Đăng nhập"}</button>
      </form>
      <p className="student-note">Không sử dụng tài khoản hoặc dữ liệu học tập chính thức của Học viện Hàng không Việt Nam.</p>
    </section>
  </main>;
}
