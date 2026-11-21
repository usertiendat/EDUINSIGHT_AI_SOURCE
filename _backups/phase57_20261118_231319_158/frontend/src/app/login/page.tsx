"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, ChevronRight, Eye, EyeOff, GraduationCap, LockKeyhole, ShieldCheck, UsersRound } from "lucide-react";
import "./role-login.css";

type Role = "student" | "lecturer" | "admin";
const roles: Array<{
  id: Role;
  title: string;
  description: string;
  label: string;
  Icon: typeof GraduationCap;
  active: boolean;
}> = [
  {
    id: "student",
    title: "Sinh viên",
    description: "Theo dõi kết quả học tập, chuyên cần và học phần của tôi.",
    label: "Sẵn sàng trải nghiệm",
    Icon: GraduationCap,
    active: true,
  },
  {
    id: "lecturer",
    title: "Giảng viên",
    description: "Quản lý lớp phụ trách và theo dõi kết quả học tập.",
    label: "Đang phát triển",
    Icon: BookOpen,
    active: false,
  },
  {
    id: "admin",
    title: "Quản trị viên",
    description: "Quản lý người dùng, phân quyền và báo cáo hệ thống.",
    label: "Đang phát triển",
    Icon: ShieldCheck,
    active: false,
  },
];

export default function LoginGateway() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = roles.find((entry) => entry.id === role)!;

  function chooseRole(next: Role) {
    if (busy) return;
    setRole(next);
    setUsername("");
    setPassword("");
    setError("");
    setShowPassword(false);
  }

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (role !== "student" || busy) return;
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/student-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username: username.trim(), password }),
        cache: "no-store",
      });
      const payload: unknown = await response.json().catch(() => null);
      const data = payload && typeof payload === "object" ? payload as { error?: string } : {};
      if (!response.ok) throw new Error(data.error || "Không thể đăng nhập. Vui lòng thử lại.");
      setPassword("");
      router.replace("/student/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="role-login">
      <div className="role-login__background" aria-hidden="true" />
      <div className="role-login__container">
        <header className="role-login__topbar">
          <div className="role-login__brand" aria-label="EduInsight AI">
            <span className="role-login__logo"><GraduationCap size={24} strokeWidth={2.2}/></span>
            <span><strong>EduInsight <em>AI</em></strong><small>Hệ thống phân tích học tập</small></span>
          </div>
          <span className="role-login__demo-badge"><span aria-hidden="true"/> Môi trường mô phỏng</span>
        </header>

        <section className="role-login__heading" aria-labelledby="login-heading">
          <span className="role-login__eyebrow">CHÀO MỪNG ĐẾN EDUINSIGHT AI</span>
          <h1 id="login-heading">Đăng nhập vào hệ thống</h1>
          <p>Chọn vai trò của bạn để truy cập đúng không gian làm việc.</p>
        </section>

        <div className="role-login__layout">
          <section className="role-login__roles" aria-labelledby="roles-heading">
            <div className="role-login__section-head">
              <h2 id="roles-heading">Chọn vai trò đăng nhập</h2>
              <span>01 / 02</span>
            </div>
            <div className="role-login__role-list">
              {roles.map(({ id, title, description, label, Icon, active }) => (
                <button
                  key={id}
                  type="button"
                  disabled={busy}
                  className={`role-login__role ${role === id ? "role-login__role--selected" : ""}`}
                  aria-pressed={role === id}
                  onClick={() => chooseRole(id)}
                >
                  <span className="role-login__role-icon"><Icon size={23} strokeWidth={1.9}/></span>
                  <span className="role-login__role-copy">
                    <strong>{title}</strong>
                    <small>{description}</small>
                    <span className={`role-login__role-status ${active ? "role-login__role-status--ready" : ""}`}>
                      {active ? <CheckCircle2 size={13}/> : <LockKeyhole size={12}/>} {label}
                    </span>
                  </span>
                  <span className="role-login__role-selector" aria-hidden="true"><ChevronRight size={20}/></span>
                </button>
              ))}
            </div>
            <div className="role-login__footnote"><ShieldCheck size={17}/><p>Vai trò thực tế được xác minh tại máy chủ. Chỉ chọn vai trò trên giao diện không cấp thêm quyền truy cập.</p></div>
          </section>

          <section className="role-login__auth" aria-labelledby="auth-heading">
            <div className="role-login__section-head"><h2 id="auth-heading">Thông tin đăng nhập</h2><span>02 / 02</span></div>
            <div className="role-login__auth-card">
              <div className="role-login__selected-banner">
                <span className="role-login__selected-icon"><selected.Icon size={22}/></span>
                <span><small>BẠN ĐANG CHỌN</small><strong>{selected.title}</strong></span>
              </div>
              {selected.active ? (
                <form className="role-login__form" onSubmit={login}>
                  <p className="role-login__form-note">Sử dụng tài khoản sinh viên mô phỏng đã được cấp.</p>
                  <label htmlFor="login-username">Tên đăng nhập</label>
                  <input id="login-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập" autoComplete="username" minLength={3} maxLength={80} required disabled={busy} />
                  <label htmlFor="login-password">Mật khẩu</label>
                  <div className="role-login__password-wrap">
                    <input id="login-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nhập mật khẩu" autoComplete="current-password" minLength={1} maxLength={256} required disabled={busy} />
                    <button type="button" className="role-login__reveal" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} disabled={busy}>
                      {showPassword ? <EyeOff size={19}/> : <Eye size={19}/>}
                    </button>
                  </div>
                  {error && <p className="role-login__error" role="alert">{error}</p>}
                  <button className="role-login__submit" type="submit" disabled={busy}>
                    {busy ? "Đang xác thực..." : "Đăng nhập sinh viên"}<ChevronRight size={19}/>
                  </button>
                  <p className="role-login__helper">Tài khoản demo: <strong>student.demo</strong>. Mật khẩu được thiết lập riêng khi khởi tạo tài khoản.</p>
                </form>
              ) : (
                <div className="role-login__coming-soon" role="status">
                  <span className="role-login__coming-icon"><UsersRound size={26}/></span>
                  <h3>Chưa kích hoạt đăng nhập {selected.title.toLowerCase()}</h3>
                  <p>Giao diện đã được chuẩn bị. Để sử dụng vai trò này, cần bổ sung tài khoản, xác thực và kiểm tra phân quyền ở FastAPI. Không sử dụng tài khoản sinh viên để đăng nhập thay.</p>
                  <button className="role-login__back" type="button" onClick={() => chooseRole("student")}>Quay về đăng nhập sinh viên</button>
                </div>
              )}
            </div>
          </section>
        </div>
        <footer className="role-login__footer"><span>© EduInsight AI · Đồ án mô phỏng phân tích học tập</span><span>Không sử dụng dữ liệu đào tạo chính thức của VAA</span></footer>
      </div>
    </main>
  );
}
