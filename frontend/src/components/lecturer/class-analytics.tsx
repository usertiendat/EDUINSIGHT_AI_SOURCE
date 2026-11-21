"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Activity, BookOpenCheck, CalendarCheck2, ChevronDown, ChevronUp,
  ClipboardCheck, GraduationCap, Search, SlidersHorizontal, UsersRound,
} from "lucide-react";

export type StudentDetail = {
  student_code: string; full_name: string; is_demo: boolean;
  quiz_score: number | null; exam_score: number | null; average_assessment: number | null;
  attendance_present: number; attendance_late: number; attendance_absent: number;
  attendance_total: number; attendance_rate: number | null;
  assignment_total: number; assignment_submitted: number;
  assignment_late: number; assignment_missing: number;
};
export type ClassRoster = {
  class: { class_key: number; class_code: string; course_code: string; course_name: string; semester_code: string };
  students: StudentDetail[];
  total_students: number;
  analytics: {
    students: number; with_grades: number; grades_mean: number | null;
    attendance_present: number; attendance_late: number; attendance_absent: number;
    attendance_total: number; attendance_rate: number | null;
    assignment_total: number; assignment_submitted: number;
    assignment_late: number; assignment_missing: number; assignment_rate: number | null;
  };
};

type Tab = "overview" | "students" | "attendance" | "assignments";
type Filter = "all" | "attendance" | "missing" | "no-grade";
const DEMO_ATTENDANCE_THRESHOLD = 80;
const numeric = (v: number | null | undefined, fraction = 2) =>
  typeof v === "number" && Number.isFinite(v)
    ? v.toLocaleString("vi-VN", { maximumFractionDigits: fraction }) : "Chưa có";
const percent = (v: number | null | undefined) =>
  typeof v === "number" && Number.isFinite(v) ? `${numeric(v)}%` : "Chưa có";
const percentOf = (value: number, total: number) => total > 0
  ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
const normalize = (s: string) => s.toLocaleLowerCase("vi-VN").normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

function Distribution({ title, description, groups, total }: {
  title: string; description: string; total: number;
  groups: { label: string; count: number; tone: "present" | "late" | "absent" }[];
}) {
  return <section className="lp2-distribution">
    <div className="lp2-distribution-header"><h3>{title}</h3><span>{numeric(total, 0)} lượt</span></div>
    <div className="lp2-segments" role="img" aria-label={groups.map(g => `${g.label}: ${g.count}`).join(", ")}>
      {groups.map(g => <span key={g.label} className={`lp2-segment lp2-tone-${g.tone}`}
        style={{ width: `${percentOf(g.count, total)}%` }} />)}
    </div>
    <div className="lp2-distribution-items">
      {groups.map(g => <div className="lp2-distribution-item" key={g.label}>
        <span className="lp2-distribution-name"><i className={`lp2-dot lp2-tone-${g.tone}`} />{g.label}</span>
        <strong>{numeric(g.count, 0)}</strong><small>{total > 0 ? `${numeric(percentOf(g.count, total))}%` : "—"}</small>
      </div>)}
    </div>
    <p className="lp2-help">{description}</p>
  </section>;
}

export default function ClassAnalytics({ roster }: { roster: ClassRoster }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState("code");
  const [expanded, setExpanded] = useState<string | null>(null);
  const a = roster.analytics;
  const filtered = useMemo(() => roster.students.filter(s => {
    if (query.trim() && !normalize(`${s.student_code} ${s.full_name}`).includes(normalize(query.trim()))) return false;
    if (filter === "attendance") return s.attendance_rate !== null && s.attendance_rate < DEMO_ATTENDANCE_THRESHOLD;
    if (filter === "missing") return s.assignment_missing > 0;
    if (filter === "no-grade") return s.average_assessment === null;
    return true;
  }).sort((x, y) => {
    if (sort === "attendance") return (x.attendance_rate ?? 101) - (y.attendance_rate ?? 101);
    if (sort === "grade") return (x.average_assessment ?? -1) - (y.average_assessment ?? -1);
    if (sort === "missing") return y.assignment_missing - x.assignment_missing;
    return x.student_code.localeCompare(y.student_code, "vi", { numeric: true });
  }), [roster.students, query, filter, sort]);

  const tabOptions: { value: Tab; label: string; icon: typeof Activity }[] = [
    { value: "overview", label: "Tổng quan", icon: Activity },
    { value: "students", label: "Sinh viên", icon: UsersRound },
    { value: "attendance", label: "Chuyên cần", icon: CalendarCheck2 },
    { value: "assignments", label: "Bài tập", icon: ClipboardCheck },
  ];
  const cards = [
    { label: "Sinh viên trong lớp", value: numeric(a.students, 0), note: `${roster.students.filter(s => s.is_demo).length} hồ sơ demo cá nhân`, icon: UsersRound, tone: "blue" },
    { label: "Trung bình đánh giá", value: `${numeric(a.grades_mean)} / 10`, note: `${a.with_grades} sinh viên có điểm · Không phải GPA`, icon: GraduationCap, tone: "violet" },
    { label: "Tỷ lệ có mặt", value: percent(a.attendance_rate), note: `${a.attendance_present}/${a.attendance_total} lượt điểm danh`, icon: CalendarCheck2, tone: "teal" },
    { label: "Tỷ lệ nộp bài", value: percent(a.assignment_rate), note: `Gồm nộp trễ · ${a.assignment_submitted}/${a.assignment_total} bài`, icon: ClipboardCheck, tone: "orange" },
  ];

  const rosterTable = (mode: "general" | "attendance" | "assignments") => <section className="lp2-card lp2-roster">
    <div className="lp2-section-heading"><div><h3>{mode === "attendance" ? "Chuyên cần theo sinh viên" : mode === "assignments" ? "Bài tập theo sinh viên" : "Danh sách sinh viên"}</h3>
      <p>Chỉ hiển thị dữ liệu của lớp đang phụ trách. Chọn “Chi tiết” để xem thông tin trong lớp.</p></div>
      <span className="lp2-count">{filtered.length}/{roster.total_students} sinh viên</span>
    </div>
    <div className="lp2-controls">
      <label className="lp2-search"><Search size={17} aria-hidden="true" /><span className="lp2-sr">Tìm mã hoặc tên sinh viên</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm mã hoặc tên sinh viên..." /></label>
      <label className="lp2-select"><span><SlidersHorizontal size={14} aria-hidden="true" /> Bộ lọc</span><select value={filter} onChange={e => setFilter(e.target.value as Filter)}><option value="all">Tất cả sinh viên</option><option value="attendance">Có mặt dưới 80% (demo)</option><option value="missing">Có bài chưa nộp</option><option value="no-grade">Chưa có điểm đánh giá</option></select></label>
      <label className="lp2-select"><span>Sắp xếp</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="code">Theo mã sinh viên</option><option value="attendance">Chuyên cần thấp trước</option><option value="grade">Điểm thấp trước</option><option value="missing">Nhiều bài thiếu trước</option></select></label>
    </div>
    <div className="lp2-table-wrap"><table className="lp2-table"><thead><tr><th>Sinh viên</th>
      {mode === "attendance" ? <><th>Có mặt</th><th>Đi muộn</th><th>Vắng</th><th>Tỷ lệ có mặt</th></> : mode === "assignments" ? <><th>Đã nộp</th><th>Nộp trễ</th><th>Chưa nộp</th><th>Tổng bài</th></> : <><th>Kiểm tra</th><th>Thi</th><th>TB đánh giá</th><th>Có mặt</th></>}
      <th>Thao tác</th></tr></thead><tbody>
      {filtered.map(s => <Fragment key={s.student_code}><tr>
        <td><strong className="lp2-student-name">{s.full_name}</strong><span className="lp2-student-meta">{s.student_code}{s.is_demo ? " · Hồ sơ demo" : ""}</span></td>
        {mode === "attendance" ? <><td>{s.attendance_present}</td><td>{s.attendance_late}</td><td>{s.attendance_absent}</td><td><span className="lp2-value">{percent(s.attendance_rate)}</span></td></> : mode === "assignments" ? <><td>{s.assignment_submitted}</td><td>{s.assignment_late}</td><td>{s.assignment_missing}</td><td>{s.assignment_total}</td></> : <><td>{numeric(s.quiz_score)}</td><td>{numeric(s.exam_score)}</td><td><span className="lp2-value">{numeric(s.average_assessment)}</span></td><td>{percent(s.attendance_rate)}</td></>}
        <td><button className="lp2-detail-button" type="button" onClick={() => setExpanded(p => p === s.student_code ? null : s.student_code)} aria-expanded={expanded === s.student_code}>{expanded === s.student_code ? "Thu gọn" : "Chi tiết"}{expanded === s.student_code ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button></td>
      </tr>{expanded === s.student_code && <tr className="lp2-expanded"><td colSpan={6}><div className="lp2-detail-grid">
        <div><h4><BookOpenCheck size={16} /> Điểm đánh giá</h4><p>Kiểm tra <strong>{numeric(s.quiz_score)}/10</strong></p><p>Thi <strong>{numeric(s.exam_score)}/10</strong></p><p>Trung bình <strong>{numeric(s.average_assessment)}/10</strong></p></div>
        <div><h4><CalendarCheck2 size={16} /> Chuyên cần</h4><p>Có mặt <strong>{s.attendance_present}/{s.attendance_total}</strong></p><p>Đi muộn <strong>{s.attendance_late}</strong></p><p>Vắng <strong>{s.attendance_absent}</strong></p></div>
        <div><h4><ClipboardCheck size={16} /> Bài tập</h4><p>Đã nộp (gồm trễ) <strong>{s.assignment_submitted}/{s.assignment_total}</strong></p><p>Nộp trễ <strong>{s.assignment_late}</strong></p><p>Chưa nộp <strong>{s.assignment_missing}</strong></p></div>
      </div></td></tr>}</Fragment>)}
    </tbody></table>{filtered.length === 0 && <div className="lp2-no-results">Không tìm thấy sinh viên phù hợp. Hãy thử thay đổi từ khóa hoặc bộ lọc.</div>}</div>
    <div className="lp2-footnote">Các chỉ số chỉ thuộc lớp hiện tại, không phải điểm tổng kết học phần hoặc đánh giá học lực. Ngưỡng 80% chỉ dùng minh họa.</div>
  </section>;

  return <div className="lp2-class-page">
    <div className="lp2-metrics" aria-label="Tổng quan lớp học phần">
      {cards.map(card => <div className="lp2-metric-card" key={card.label}><div className="lp2-metric-top"><span>{card.label}</span><span className={`lp2-metric-icon lp2-icon-${card.tone}`}><card.icon size={19} aria-hidden="true" /></span></div><strong>{card.value}</strong><small>{card.note}</small></div>)}
    </div>
    <div className="lp2-tabs" role="tablist" aria-label="Chọn nội dung phân tích lớp">
      {tabOptions.map(t => <button key={t.value} type="button" role="tab" id={`lp2-tab-${t.value}`} aria-selected={tab === t.value} aria-controls={`lp2-panel-${t.value}`} className={tab === t.value ? "lp2-tab is-selected" : "lp2-tab"} onClick={() => setTab(t.value)}><t.icon size={17} aria-hidden="true" />{t.label}</button>)}
    </div>
    <div role="tabpanel" id={`lp2-panel-${tab}`} aria-labelledby={`lp2-tab-${tab}`} className="lp2-tab-panel">
      {tab === "overview" && <div className="lp2-overview-grid">
        <Distribution title="Phân bố chuyên cần" total={a.attendance_total} description="Đơn vị là lượt điểm danh; chỉ trạng thái có mặt tính vào tỷ lệ có mặt." groups={[
          { label: "Có mặt", count: a.attendance_present, tone: "present" }, { label: "Đi muộn", count: a.attendance_late, tone: "late" }, { label: "Vắng", count: a.attendance_absent, tone: "absent" },
        ]} />
        <Distribution title="Tình trạng bài tập" total={a.assignment_total} description="Tỷ lệ nộp bao gồm bài nộp trễ, không đại diện điểm học phần." groups={[
          { label: "Đã nộp đúng hạn", count: Math.max(0, a.assignment_submitted - a.assignment_late), tone: "present" }, { label: "Nộp trễ", count: a.assignment_late, tone: "late" }, { label: "Chưa nộp", count: a.assignment_missing, tone: "absent" },
        ]} />
        <section className="lp2-card lp2-insight"><h3><Activity size={18} /> Hướng dẫn đọc số liệu</h3><p>Điểm trung bình là trung bình điểm kiểm tra và thi mô phỏng, không phải GPA hay điểm học phần chính thức.</p><p>Chuyển sang các tab để xem dữ liệu theo từng sinh viên thuộc đúng lớp này.</p></section>
      </div>}
      {tab === "students" && rosterTable("general")}
      {tab === "attendance" && <div className="lp2-tab-stack"><Distribution title="Tổng hợp chuyên cần trong lớp" total={a.attendance_total} description="Đi muộn và vắng được thống kê riêng; không cộng vào tỷ lệ có mặt." groups={[
        { label: "Có mặt", count: a.attendance_present, tone: "present" }, { label: "Đi muộn", count: a.attendance_late, tone: "late" }, { label: "Vắng", count: a.attendance_absent, tone: "absent" },
      ]}/>{rosterTable("attendance")}</div>}
      {tab === "assignments" && <div className="lp2-tab-stack"><Distribution title="Tổng hợp bài tập trong lớp" total={a.assignment_total} description="Số bài đã nộp bao gồm các bài nộp trễ." groups={[
        { label: "Đã nộp đúng hạn", count: Math.max(0, a.assignment_submitted - a.assignment_late), tone: "present" }, { label: "Nộp trễ", count: a.assignment_late, tone: "late" }, { label: "Chưa nộp", count: a.assignment_missing, tone: "absent" },
      ]}/>{rosterTable("assignments")}</div>}
    </div>
  </div>;
}
