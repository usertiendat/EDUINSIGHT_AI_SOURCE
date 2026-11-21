"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowDownToLine, ArrowRightLeft, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, GraduationCap, RefreshCw, School, TrendingUp, Users } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppShell from "@/components/layout/app-shell";
import { delta, downloadSemesterCsv, fetchSemesters, metric, type Semester, vnNumber } from "@/lib/semester-data";
import "./semesters.css";

type MetricKey = "average_grade" | "attendance_rate" | "assignment_submission_rate";
const chartOptions: { key: MetricKey; label: string; color: string; unit: string; max: number }[] = [
  { key: "average_grade", label: "Điểm trung bình", color: "#377bf6", unit: "/10", max: 10 },
  { key: "attendance_rate", label: "Tỷ lệ chuyên cần", color: "#10a98c", unit: "%", max: 100 },
  { key: "assignment_submission_rate", label: "Tỷ lệ nộp bài", color: "#8a6aef", unit: "%", max: 100 },
];

function StatCard({ label, value, note, icon, tone }: { label: string; value: string; note: string; icon: ReactNode; tone: string }) {
  return <div className="sem-kpi"><span className={`sem-kpi-icon ${tone}`}>{icon}</span><span className="sem-kpi-label">{label}</span><strong>{value}</strong><small>{note}</small></div>;
}
function Gap({ first, last, suffix }: { first: number | null; last: number | null; suffix: string }) {
  const d = delta(first, last);
  return <span className={d === null ? "sem-delta sem-neutral" : d > 0 ? "sem-delta sem-positive" : d < 0 ? "sem-delta sem-negative" : "sem-delta sem-neutral"}>
    {d === null ? "Thiếu dữ liệu" : `${d > 0 ? "+" : ""}${metric(d)} ${suffix}`}
  </span>;
}

export default function SemesterAnalyticsPage() {
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [year, setYear] = useState("all");
  const [selected, setSelected] = useState("");
  const [firstCode, setFirstCode] = useState("");
  const [lastCode, setLastCode] = useState("");
  const [metricKey, setMetricKey] = useState<MetricKey>("average_grade");
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchSemesters(controller.signal).then(rows => {
      if (controller.signal.aborted) return;
      setSemesters(rows);
      setError("");
      setUpdatedAt(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
    }).catch((e: unknown) => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu học kỳ.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  const years = useMemo(() => [...new Set(semesters.map(s => s.academic_year))].sort(), [semesters]);
  const filtered = useMemo(() => semesters.filter(s => year === "all" || s.academic_year === year), [semesters, year]);
  const active = filtered.find(s => s.semester_code === selected) ?? filtered.at(-1) ?? null;
  const first = filtered.find(s => s.semester_code === firstCode) ?? filtered[0] ?? null;
  const last = filtered.find(s => s.semester_code === lastCode) ?? filtered.at(-1) ?? null;
  const comparisonSame = !!first && !!last && first.semester_code === last.semester_code;
  const orderedFirst = first;
  const orderedLast = last;
  const chart = chartOptions.find(c => c.key === metricKey)!;
  const chartData = filtered.map(s => ({ name: s.semester_code, value: s[metricKey] }));
  const refresh = () => { setLoading(true); setReload(k => k + 1); };

  return <AppShell>
    <main className="dashboard-content sem-content">
      <header className="sem-heading">
        <div><p className="eyebrow">EDUINSIGHT AI / PHÂN TÍCH HỌC KỲ</p><h1>Phân tích học kỳ <span className="heading-stars">✦</span></h1><p className="page-subtitle">Theo dõi kết quả học tập, chuyên cần và nộp bài theo từng học kỳ.</p></div>
        <div className="sem-actions"><button type="button" className="outline-button" disabled={loading} onClick={refresh}><RefreshCw size={16} className={loading ? "spin" : ""}/> Làm mới</button><button type="button" className="primary-button" disabled={!filtered.length || loading} onClick={() => downloadSemesterCsv(filtered, `eduinsight-hoc-ky-${year === "all" ? "tat-ca" : year.replaceAll("/", "-")}.csv`)}><ArrowDownToLine size={16}/> Xuất CSV</button></div>
      </header>
      <section className="sem-filter-panel" aria-label="Bộ lọc học kỳ"><label>Năm học<select value={year} onChange={e => { setYear(e.target.value); setSelected(""); setFirstCode(""); setLastCode(""); }}><option value="all">Tất cả năm học</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label><label>Học kỳ đang xem<select value={active?.semester_code ?? ""} disabled={!filtered.length} onChange={e => setSelected(e.target.value)}>{filtered.map(s => <option key={s.semester_key} value={s.semester_code}>{s.semester_code}</option>)}</select></label><p><CalendarDays size={15}/> {filtered.length} học kỳ trong phạm vi đang chọn</p></section>
      {error && <div className="error-alert" role="alert"><span>{error}</span><button type="button" onClick={refresh}>Thử lại</button></div>}
      {loading && <div className="sem-loading" role="status"><RefreshCw size={20} className="spin"/> Đang tải thống kê học kỳ...</div>}
      {!loading && !error && !filtered.length && <div className="sem-empty" role="status">Chưa có dữ liệu học kỳ cho phạm vi đang chọn.</div>}
      {!error && !!active && <>
        <section className="sem-kpi-grid" aria-label={`Các chỉ số học kỳ ${active.semester_code}`}>
          <StatCard label="Sinh viên trong kỳ" value={vnNumber(active.total_students)} note="Số sinh viên riêng biệt trong học kỳ" icon={<Users size={21}/>} tone="sem-blue"/>
          <StatCard label="Lớp học phần" value={vnNumber(active.total_classes)} note={`${vnNumber(active.total_enrollments)} lượt đăng ký`} icon={<School size={21}/>} tone="sem-violet"/>
          <StatCard label="Điểm trung bình" value={`${metric(active.average_grade)} / 10`} note="Điểm tổng hợp của học kỳ" icon={<GraduationCap size={21}/>} tone="sem-green"/>
          <StatCard label="Chuyên cần" value={metric(active.attendance_rate, "%")} note="Tỷ lệ theo bản ghi điểm danh" icon={<Activity size={21}/>} tone="sem-amber"/>
          <StatCard label="Nộp bài" value={metric(active.assignment_submission_rate, "%")} note="Theo dữ liệu bài tập của học kỳ" icon={<ClipboardCheck size={21}/>} tone="sem-blue"/>
        </section>
        <div className="sem-two-columns">
          <section className="panel sem-chart-panel"><div className="sem-panel-head"><div><h2><TrendingUp size={18}/> Xu hướng theo học kỳ</h2><p>Giá trị lấy trực tiếp từ API Analytics</p></div><select aria-label="Chỉ số biểu đồ" value={metricKey} onChange={e => setMetricKey(e.target.value as MetricKey)}>{chartOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</select></div><div className="sem-chart" role="img" aria-label={`Biểu đồ ${chart.label} qua ${filtered.length} học kỳ`}><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 18, right: 20, bottom: 12, left: -8 }}><CartesianGrid stroke="#ebeff7" strokeDasharray="4 5" vertical={false}/><XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6c7a94" }} tickLine={false} axisLine={false}/><YAxis domain={[0, chart.max]} tick={{ fontSize: 11, fill: "#8a96ad" }} tickLine={false} axisLine={false}/><Tooltip formatter={(v) => [metric(typeof v === "number" ? v : null, chart.unit === "%" ? "%" : " điểm"), chart.label]} contentStyle={{ borderRadius: 10, border: "1px solid #e6ebf4", fontFamily: "inherit" }}/><Line type="monotone" dataKey="value" stroke={chart.color} strokeWidth={3} dot={{ r: 5, fill: chart.color, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 7 }} connectNulls={false}/></LineChart></ResponsiveContainer></div><div className="sem-chart-foot"><span><span className="sem-legend-dot" style={{ background: chart.color }}/>{chart.label}</span><span>{chart.unit === "%" ? "Đơn vị: phần trăm" : "Thang điểm 10"}</span></div></section>
          <section className="panel sem-compare-panel"><div className="sem-panel-head"><div><h2><ArrowRightLeft size={18}/> So sánh hai học kỳ</h2><p>Chênh lệch giữa hai kỳ được chọn</p></div></div><div className="sem-compare-controls"><label>Kỳ đầu<select aria-label="Chọn học kỳ đầu" value={first?.semester_code ?? ""} onChange={e => setFirstCode(e.target.value)}>{filtered.map(s => <option key={s.semester_key} value={s.semester_code}>{s.semester_code}</option>)}</select></label><label>Kỳ cuối<select aria-label="Chọn học kỳ cuối" value={last?.semester_code ?? ""} onChange={e => setLastCode(e.target.value)}>{filtered.map(s => <option key={s.semester_key} value={s.semester_code}>{s.semester_code}</option>)}</select></label></div>{comparisonSame ? <p className="sem-compare-hint">Hãy chọn hai học kỳ khác nhau để xem chênh lệch.</p> : orderedFirst && orderedLast ? <div className="sem-compare-results"><div><span>Điểm trung bình</span><Gap first={orderedFirst.average_grade} last={orderedLast.average_grade} suffix="điểm"/></div><div><span>Chuyên cần</span><Gap first={orderedFirst.attendance_rate} last={orderedLast.attendance_rate} suffix="điểm %"/></div><div><span>Nộp bài</span><Gap first={orderedFirst.assignment_submission_rate} last={orderedLast.assignment_submission_rate} suffix="điểm %"/></div><div><span>Lượt đăng ký</span><span className="sem-delta sem-neutral">{(orderedLast.total_enrollments - orderedFirst.total_enrollments) > 0 ? "+" : ""}{vnNumber(orderedLast.total_enrollments - orderedFirst.total_enrollments)}</span></div></div> : null}<p className="sem-compare-note">Chênh lệch được tính từ kỳ đầu đến kỳ cuối bạn chọn ({orderedFirst?.semester_code ?? "—"} → {orderedLast?.semester_code ?? "—"}). Chênh lệch tỷ lệ là <strong>điểm phần trăm</strong>, không phải phần trăm tăng trưởng.</p></section>
        </div>
        <section className="panel sem-table-panel"><div className="sem-panel-head"><div><h2><BookOpen size={18}/> Bảng kết quả các học kỳ</h2><p>Chọn một dòng để xem KPI của học kỳ tương ứng</p></div><span className="sem-count">{filtered.length} học kỳ</span></div><div className="table-scroll"><table className="course-table sem-table"><thead><tr><th>Học kỳ</th><th>Năm học</th><th>Số lớp</th><th>Sinh viên</th><th>Lượt đăng ký</th><th>Điểm TB</th><th>Chuyên cần</th><th>Nộp bài</th></tr></thead><tbody>{filtered.map(s => <tr key={s.semester_key} className={active.semester_code === s.semester_code ? "sem-row-selected" : ""}><td><button type="button" className="sem-semester-link" onClick={() => { setSelected(s.semester_code); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label={`Xem thống kê học kỳ ${s.semester_code}`}>{s.semester_code}</button></td><td>{s.academic_year}</td><td>{vnNumber(s.total_classes)}</td><td>{vnNumber(s.total_students)}</td><td>{vnNumber(s.total_enrollments)}</td><td><strong>{metric(s.average_grade)}</strong></td><td>{metric(s.attendance_rate, "%")}</td><td>{metric(s.assignment_submission_rate, "%")}</td></tr>)}</tbody></table></div></section>
      </>}
      <footer className="sem-note"><CheckCircle2 size={16}/><span>Dữ liệu mô phỏng phục vụ nghiên cứu. Số sinh viên là số riêng biệt <strong>trong từng học kỳ</strong>, không cộng dồn thành số sinh viên toàn trường. Chỉ số khoa theo học kỳ chưa có trong API hiện tại.</span>{updatedAt && <span className="sem-updated">Cập nhật {updatedAt}</span>}</footer>
    </main>
  </AppShell>;
}
