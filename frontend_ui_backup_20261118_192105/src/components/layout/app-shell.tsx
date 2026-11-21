"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, BrainCircuit, CalendarDays, ChevronDown, Database, GraduationCap, LayoutDashboard, Menu, Search, ShieldCheck, Sparkles, Users, X } from "lucide-react";

type Props = {
  children: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onAiClick?: () => void;
};

const nav = [
  { label: "Tổng quan", href: "/", icon: LayoutDashboard },
  { label: "Sinh viên", href: "/students", icon: Users },
  { label: "Khoa / Phân tích", href: "/departments", icon: BarChart3 },
  { label: "Phân tích học kỳ", href: "/#semesters", icon: CalendarDays },
  { label: "Học phần", href: "/courses", icon: BookOpen },
];

export default function AppShell({ children, searchValue, onSearchChange, onAiClick }: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDashboard = pathname === "/";
  const closeMenu = () => setSidebarOpen(false);
  return (
    <div className="app-frame">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-icon"><GraduationCap size={22}/></span>
          <div><strong>EduInsight <span>AI</span></strong><small>Education Intelligence</small></div>
          <button className="mobile-close" aria-label="Đóng menu" onClick={closeMenu}><X size={18}/></button>
        </div>
        <div className="workspace"><span className="workspace-badge"><Sparkles size={16}/></span><span><strong>EduInsight Workspace</strong><small>University Analytics</small></span><ChevronDown size={14}/></div>
        <div className="nav-caption">KHÔNG GIAN LÀM VIỆC</div>
        <nav className="side-nav" aria-label="Điều hướng chính">
          {nav.map(({label, href, icon: Icon}) => {
            const active = href === "/" ? isDashboard : href === "/students" ? pathname.startsWith("/students") : href === "/courses" ? pathname.startsWith("/courses") : href === "/departments" ? pathname.startsWith("/departments") : false;
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={closeMenu} className={`nav-link ${active ? "nav-active" : ""}`}><Icon size={17}/>{label}</Link>;
          })}
        </nav>
        <div className="nav-caption nav-caption-second">HỆ THỐNG</div>
        <div className="side-nav">
          <Link className="nav-link" href="/#quality" onClick={closeMenu}><Database size={17}/>Nguồn dữ liệu</Link>
          {onAiClick ? <button type="button" className="nav-link" onClick={onAiClick}><BrainCircuit size={17}/>AI Insights <span className="soon">Sắp có</span></button> : <span className="nav-link" aria-label="AI Insights sắp triển khai"><BrainCircuit size={17}/>AI Insights <span className="soon">Sắp có</span></span>}
        </div>
        <div className="sidebar-bottom">
          <div className="assistant-promo"><div className="promo-icon"><BrainCircuit size={22}/></div><strong>EduInsight AI Assistant</strong><p>Trợ lý phân tích dữ liệu học tập — đang phát triển.</p>{onAiClick && <button type="button" onClick={onAiClick}>Tìm hiểu thêm <Sparkles size={14}/></button>}</div>
          <div className="sidebar-footer"><ShieldCheck size={17}/> Dữ liệu giả lập • Development</div>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-overlay" aria-label="Đóng menu" onClick={closeMenu}/>}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" aria-label="Mở menu" onClick={() => setSidebarOpen(true)}><Menu size={22}/></button>
            {onSearchChange ? <label className="top-search"><Search size={17}/><input value={searchValue ?? ""} onChange={e => onSearchChange(e.target.value)} placeholder="Tìm học phần, mã học phần, khoa..." aria-label="Tìm học phần" /></label>
              : <div className="topbar-breadcrumb"><span>EduInsight AI</span><ChevronDown size={14}/><strong>{pathname.startsWith("/students") ? "Quản lý sinh viên" : pathname.startsWith("/departments") ? "Quản lý khoa" : pathname.startsWith("/courses") ? "Quản lý học phần" : "Analytics"}</strong></div>}
          </div>
          <div className="topbar-right"><span className="environment-pill"><span className="status-dot"/> Development</span><div className="top-divider"/><span className="avatar">AD</span><div className="user-label"><strong>Admin Demo</strong><small>University Analyst</small></div></div>
        </header>
        {children}
      </div>
    </div>
  );
}
