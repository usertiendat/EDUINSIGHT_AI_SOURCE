"use client";

import AppShell from "@/components/layout/app-shell";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity, ArrowDownToLine, BarChart3, BookOpen, BrainCircuit,
  CalendarDays, CheckCircle2, ChevronDown, CircleHelp, ClipboardList,
  Database, GraduationCap, LayoutDashboard, Menu, RefreshCw,
  Search, Settings, ShieldCheck, Sparkles, TrendingUp, Users, X, Filter, ArrowLeft, ArrowRight, AlertCircle, Target, FileText, ArrowUpRight,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line,
  LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type Overview = {
  total_students: number;
  total_instructors: number;
  total_courses: number;
  total_classes: number;
  total_enrollments: number;
  average_grade: number | null;
  attendance_rate: number | null;
  assignment_submission_rate: number | null;
};
type Department = {
  department_key: number;
  department_code: string;
  department_name: string;
  total_students: number;
  total_courses: number;
  total_instructors: number;
};
type Semester = {
  semester_key: number;
  semester_code: string;
  academic_year: string;
  total_classes: number;
  total_students: number;
  total_enrollments: number;
  average_grade: number | null;
  attendance_rate: number | null;
  assignment_submission_rate: number | null;
};
type Course = {
  course_key: number;
  course_code: string;
  course_name: string;
  department_name: string;
  total_students: number;
  total_enrollments: number;
  average_grade: number | null;
  attendance_rate: number | null;
  assignment_submission_rate: number | null;
};
type DashboardData = {
  overview: Overview;
  departments: Department[];
  semesters: Semester[];
  courses: Course[];
};

const formatNum = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const percent = (value: number | null) => value === null ? "—" : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%`;
const score = (value: number | null) => value === null ? "—" : value.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const departmentLabel = (name: string) => ({
  "Cong nghe thong tin": "Công nghệ thông tin",
  "Kinh te": "Kinh tế",
  "Ngoai ngu": "Ngoại ngữ",
  "Ky thuat": "Kỹ thuật",
  "Khoa hoc xa hoi": "Khoa học xã hội",
} as Record<string, string>)[name] ?? name;

function exportCourses(rows: Course[]) {
  const headers = ["Mã học phần", "Tên học phần", "Khoa", "Lượt đăng ký", "Điểm TB", "Chuyên cần (%)", "Nộp bài (%)"];
  const csvCell = (value: string | number | null) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const lines = [headers, ...rows.map((row) => [
    row.course_code, row.course_name, row.department_name, row.total_enrollments,
    row.average_grade, row.attendance_rate, row.assignment_submission_rate,
  ])].map((cells) => cells.map(csvCell).join(","));
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "eduinsight-courses.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [courseSort, setCourseSort] = useState("enrollments");
  const [coursePage, setCoursePage] = useState(1);
  const pageSize = 8;
  const [year, setYear] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");

  async function loadDashboard() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Không thể tải dữ liệu");
      setData(json as DashboardData);
      setUpdatedAt(new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadDashboard(); }, []);

  const filteredSemesters = useMemo(() =>
    (data?.semesters ?? []).filter((s) => year === "all" || s.semester_code.startsWith(year)),
  [data, year]);
  const filteredCourses = useMemo(() =>
    (data?.courses ?? [])
      .filter((c) =>
        `${c.course_code} ${c.course_name} ${c.department_name}`.toLowerCase().includes(searchText.trim().toLowerCase())
        && (departmentFilter === "all" || c.department_name === departmentFilter),
      )
      .sort((a, b) => {
        if (courseSort === "grade") return (b.average_grade ?? -1) - (a.average_grade ?? -1);
        if (courseSort === "attendance") return (b.attendance_rate ?? -1) - (a.attendance_rate ?? -1);
        if (courseSort === "name") return a.course_code.localeCompare(b.course_code);
        return b.total_enrollments - a.total_enrollments;
      }),
  [data, searchText, departmentFilter, courseSort]);
  const totalCoursePages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const visibleCourses = filteredCourses.slice((Math.min(coursePage, totalCoursePages) - 1) * pageSize, Math.min(coursePage, totalCoursePages) * pageSize);
  const latestSemester = filteredSemesters.at(-1) ?? null;
  const firstSemester = filteredSemesters[0] ?? null;
  const gradeChange = latestSemester?.average_grade != null && firstSemester?.average_grade != null
    ? latestSemester.average_grade - firstSemester.average_grade : null;
  const attendanceChange = latestSemester?.attendance_rate != null && firstSemester?.attendance_rate != null
    ? latestSemester.attendance_rate - firstSemester.attendance_rate : null;
  const submissionChange = latestSemester?.assignment_submission_rate != null && firstSemester?.assignment_submission_rate != null
    ? latestSemester.assignment_submission_rate - firstSemester.assignment_submission_rate : null;
  const bestCourse = [...filteredCourses].filter((c) => c.average_grade !== null).sort((a,b) => (b.average_grade ?? 0) - (a.average_grade ?? 0))[0] ?? null;
  const chartDepartments = useMemo(() => (data?.departments ?? []).map((d) => ({
    name: departmentLabel(d.department_name), students: d.total_students,
  })), [data]);
  const departmentChartHeight = Math.max(250, chartDepartments.length * 46 + 32);
  const chartSemesters = useMemo(() => filteredSemesters.map((s) => ({
    name: s.semester_code, grade: s.average_grade, attendance: s.attendance_rate,
    submission: s.assignment_submission_rate, enrollments: s.total_enrollments,
  })), [filteredSemesters]);
  const leadingCourses = useMemo(() => [...filteredCourses]
    .sort((a, b) => b.total_enrollments - a.total_enrollments)
    .slice(0, 7).map((c) => ({
      name: c.course_code, students: c.total_enrollments,
    })), [filteredCourses]);

  return (
    <AppShell searchValue={searchText} onSearchChange={(value) => { setSearchText(value); setCoursePage(1); }} onAiClick={() => setInsightOpen(true)}>
        <div className="dashboard-content">
          <div className="page-heading"><div><p className="eyebrow">EDUINSIGHT AI / TỔNG QUAN</p><h1>Tổng quan và phân tích <span className="heading-stars">✦</span></h1><p className="page-subtitle">Tổng quan hiệu quả học tập và hoạt động đào tạo từ kho dữ liệu.</p></div><div className="page-actions"><div className="year-filter"><button className={year === "all" ? "selected" : ""} onClick={() => setYear("all")}>Tất cả</button><button className={year === "2025" ? "selected" : ""} onClick={() => setYear("2025")}>2025</button><button className={year === "2026" ? "selected" : ""} onClick={() => setYear("2026")}>2026</button></div><button className="outline-button" onClick={() => void loadDashboard()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/> Làm mới</button><button className="primary-button" onClick={() => setInsightOpen(true)}><Sparkles size={15}/> Trợ lý AI</button></div></div>

          {error && <div className="error-alert"><CircleHelp size={18}/><span>{error}</span><button onClick={() => void loadDashboard()}>Thử lại</button></div>}
          {loading && !data ? <div className="loading-box"><RefreshCw className="spin" size={28}/><span>Đang kết nối kho dữ liệu...</span></div> : data && <>
            <section className="kpi-grid" aria-label="Các chỉ số tổng quan">
              <Kpi label="Tổng sinh viên" value={formatNum(data.overview.total_students)} note={`${formatNum(data.overview.total_enrollments)} lượt đăng ký`} icon={<Users size={22}/>} variant="blue"/>
              <Kpi label="Điểm trung bình" value={`${score(data.overview.average_grade)} / 10`} note="Điểm quy đổi thang 10" icon={<GraduationCap size={22}/>} variant="green"/>
              <Kpi label="Tỷ lệ hiện diện" value={percent(data.overview.attendance_rate)} note="Tính theo bản ghi điểm danh" icon={<CalendarDays size={22}/>} variant="violet"/>
              <Kpi label="Tỷ lệ nộp bài" value={percent(data.overview.assignment_submission_rate)} note="Bao gồm bài nộp trễ" icon={<ClipboardList size={22}/>} variant="amber"/>
            </section>

            <section className="insight-strip" aria-label="So sánh theo học kỳ">
              <div className="insight-strip-heading"><span className="strip-icon"><Target size={18}/></span><div><strong>Tổng hợp kết quả học tập</strong><small>So sánh học kỳ đầu và cuối trong khoảng đang chọn · Không phải dự báo AI</small></div></div>
              <div className="strip-metrics">
                <DeltaMetric label="Điểm trung bình" value={gradeChange} suffix=" điểm"/>
                <DeltaMetric label="Chuyên cần" value={attendanceChange} suffix=" điểm %"/>
                <DeltaMetric label="Tỷ lệ nộp bài" value={submissionChange} suffix=" điểm %"/>
              </div>
            </section>
            <div className="content-grid">
              <div className="primary-column">
                <div className="two-panel-row" id="departments">
                  <section className="panel"><PanelHeader title="Sinh viên theo khoa" subtitle="Phân bố sinh viên hiện tại" icon={<Users size={18}/>} /><div className="chart-area chart-area-departments" style={{height:departmentChartHeight}}><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={chartDepartments} margin={{top:8,right:20,bottom:12,left:4}}><CartesianGrid strokeDasharray="4 5" horizontal={false} stroke="#edf1f8"/><XAxis type="number" allowDecimals={false} tick={{fontSize:11,fill:"#8190a8"}}/><YAxis type="category" dataKey="name" width={178} interval={0} tick={{fontSize:11,fill:"#52627c"}} tickLine={false}/><Tooltip cursor={{fill:"#f5f8fe"}} formatter={(value) => [formatNum(Number(value)),"Sinh viên"]}/><Bar dataKey="students" fill="#3779f6" radius={[0,6,6,0]} maxBarSize={22}/></BarChart></ResponsiveContainer></div></section>
                  <section className="panel" id="semesters"><PanelHeader title="Kết quả theo học kỳ" subtitle="Điểm trung bình trên thang 10" icon={<TrendingUp size={18}/>} /><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartSemesters} margin={{top:12,right:14,bottom:8,left:-20}}><defs><linearGradient id="gradeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7163eb" stopOpacity={0.18}/><stop offset="95%" stopColor="#7163eb" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#edf1f8"/><XAxis dataKey="name" tick={{fontSize:11,fill:"#8190a8"}}/><YAxis domain={[0,10]} tick={{fontSize:11,fill:"#8190a8"}}/><Tooltip formatter={(value) => [score(Number(value)),"Điểm trung bình"]}/><Area type="monotone" dataKey="grade" stroke="#7163eb" strokeWidth={2.5} fill="url(#gradeFill)" activeDot={{r:5}}/></AreaChart></ResponsiveContainer></div></section>
                </div>
                <div className="two-panel-row">
                  <section className="panel"><PanelHeader title="Chuyên cần & nộp bài" subtitle="Tỷ lệ (%) theo học kỳ" icon={<Activity size={18}/>} /><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartSemesters} margin={{top:12,right:10,bottom:8,left:-18}}><CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#edf1f8"/><XAxis dataKey="name" tick={{fontSize:11,fill:"#8190a8"}}/><YAxis domain={[0,100]} tick={{fontSize:11,fill:"#8190a8"}}/><Tooltip formatter={(value,name) => [`${value}%`,name === "attendance" ? "Chuyên cần" : "Nộp bài"]}/><Legend formatter={(value) => value === "attendance" ? "Chuyên cần" : "Nộp bài"}/><Line type="monotone" dataKey="attendance" stroke="#16b69a" strokeWidth={2.5} dot={{r:4}}/><Line type="monotone" dataKey="submission" stroke="#836cf4" strokeWidth={2.5} dot={{r:4}}/></LineChart></ResponsiveContainer></div></section>
                  <section className="panel"><PanelHeader title="Học phần nổi bật" subtitle="Theo số lượt đăng ký" icon={<BookOpen size={18}/>} /><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={leadingCourses} layout="vertical" margin={{top:10,right:24,bottom:8,left:0}}><CartesianGrid strokeDasharray="4 5" horizontal={false} stroke="#edf1f8"/><XAxis type="number" tick={{fontSize:11,fill:"#8190a8"}}/><YAxis dataKey="name" type="category" width={64} tick={{fontSize:11,fill:"#8190a8"}}/><Tooltip formatter={(value) => [formatNum(Number(value)),"Lượt đăng ký"]}/><Bar dataKey="students" fill="#17b8a6" barSize={15} radius={[0,5,5,0]}/></BarChart></ResponsiveContainer></div></section>
                </div>
                <section className="panel course-panel" id="courses"><div className="panel-heading"><div><h2><BookOpen size={18}/> Hiệu quả học phần</h2><p>Danh sách học phần — lọc và sắp xếp từ dữ liệu mô phỏng</p></div><button className="outline-button" onClick={() => exportCourses(filteredCourses)} disabled={filteredCourses.length === 0}><ArrowDownToLine size={15}/> Xuất CSV</button></div>
                <div className="course-toolbar">
                  <label><Filter size={14}/><span className="sr-only">Chọn khoa</span><select aria-label="Lọc theo khoa" value={departmentFilter} onChange={(e) => {setDepartmentFilter(e.target.value);setCoursePage(1)}}><option value="all">Tất cả các khoa</option>{data.departments.map((dept) => <option key={dept.department_key} value={dept.department_name}>{departmentLabel(dept.department_name)}</option>)}</select></label>
                  <label><span className="filter-label">Sắp xếp:</span><select aria-label="Sắp xếp học phần" value={courseSort} onChange={(e) => {setCourseSort(e.target.value);setCoursePage(1)}}><option value="enrollments">Nhiều lượt đăng ký</option><option value="grade">Điểm trung bình cao</option><option value="attendance">Chuyên cần cao</option><option value="name">Mã học phần A–Z</option></select></label>
                  {(departmentFilter !== "all" || searchText) && <button type="button" className="clear-filters" onClick={() => {setDepartmentFilter("all");setSearchText("");setCoursePage(1)}}>Xóa bộ lọc</button>}
                </div><div className="table-scroll"><table className="course-table"><thead><tr><th>Học phần</th><th>Khoa</th><th>Lượt ĐK</th><th>Điểm TB</th><th>Chuyên cần</th><th>Nộp bài</th></tr></thead><tbody>{visibleCourses.map((course) => <tr key={course.course_key}><td><strong>{course.course_code}</strong><span className="table-subtitle">{course.course_name}</span></td><td>{departmentLabel(course.department_name)}</td><td>{formatNum(course.total_enrollments)}</td><td><span className="metric-grade">{score(course.average_grade)}</span></td><td><span className="metric-positive">{percent(course.attendance_rate)}</span></td><td>{percent(course.assignment_submission_rate)}</td></tr>)}</tbody></table>{filteredCourses.length === 0 && <p className="empty-results">Không tìm thấy học phần phù hợp.</p>}</div><div className="panel-bottom course-pagination"><span>Hiển thị {visibleCourses.length} / {filteredCourses.length} học phần · Trang {Math.min(coursePage, totalCoursePages)}/{totalCoursePages}</span><div className="pagination-buttons"><button type="button" aria-label="Trang trước" disabled={coursePage <= 1} onClick={() => setCoursePage((p) => Math.max(1,p-1))}><ArrowLeft size={15}/></button><button type="button" aria-label="Trang sau" disabled={coursePage >= totalCoursePages} onClick={() => setCoursePage((p) => Math.min(totalCoursePages,p+1))}><ArrowRight size={15}/></button></div></div></section>
              </div>
              <aside className="right-column">
                <section className="panel highlight-panel">
                  <div className="highlight-title"><span><Sparkles size={17}/> Nhận định từ dữ liệu</span><span className="data-badge">Từ dữ liệu</span></div>
                  <p className="highlight-subtitle">Nhận xét mô tả tự động tính từ API, chưa sử dụng mô hình AI.</p>
                  <div className="highlight-row"><span className="highlight-icon violet-light"><TrendingUp size={17}/></span><div><strong>Biến động điểm theo kỳ</strong><small>{gradeChange === null ? "Chưa đủ dữ liệu để so sánh" : `Chênh lệch ${gradeChange >= 0 ? "+" : ""}${gradeChange.toFixed(2)} điểm giữa kỳ đầu và cuối được chọn`}</small></div></div>
                  <div className="highlight-row"><span className="highlight-icon green-light"><Activity size={17}/></span><div><strong>Thay đổi chuyên cần</strong><small>{attendanceChange === null ? "Chưa đủ dữ liệu để so sánh" : `Chênh lệch ${attendanceChange >= 0 ? "+" : ""}${attendanceChange.toFixed(2)} điểm phần trăm`}</small></div></div>
                  <div className="highlight-row"><span className="highlight-icon blue-light"><BookOpen size={17}/></span><div><strong>Điểm học phần cao nhất</strong><small>{bestCourse ? `${bestCourse.course_code} · ${score(bestCourse.average_grade)}/10 (trong danh sách đã lọc)` : "Không có học phần phù hợp"}</small></div></div>
                </section>
                <section className="panel summary-panel"><PanelHeader title="Tổng hợp dữ liệu" subtitle="Thông tin kho dữ liệu" icon={<ClipboardList size={18}/>} /><div className="summary-item"><span className="summary-icon blue-light"><GraduationCap size={18}/></span><span><strong>{formatNum(data.overview.total_courses)} học phần</strong><small>{formatNum(data.overview.total_classes)} lớp học phần</small></span></div><div className="summary-item"><span className="summary-icon green-light"><Users size={18}/></span><span><strong>{formatNum(data.overview.total_instructors)} giảng viên</strong><small>{formatNum(data.overview.total_students)} sinh viên</small></span></div><div className="summary-item"><span className="summary-icon purple-light"><Database size={18}/></span><span><strong>PostgreSQL Warehouse</strong><small>4 nguồn API thống kê</small></span></div><div className="summary-item"><span className="summary-icon amber-light"><RefreshCw size={18}/></span><span><strong>Lần tải gần nhất</strong><small>{updatedAt || "Đang cập nhật"}</small></span></div></section>
                <section className="panel quality-panel" id="quality"><PanelHeader title="Trạng thái kết nối dữ liệu" subtitle="Trạng thái nhận API gần nhất" icon={<ShieldCheck size={18}/>} /><div className="quality-state"><CheckCircle2 size={21}/><span>Đã tải thành công 4 API</span></div><p>Thông tin hiển thị được lấy từ FastAPI kết nối PostgreSQL. Đây là dữ liệu sinh viên giả lập để kiểm thử.</p><div className="quality-metrics"><div><strong>{formatNum(data.departments.length)}</strong><span>Khoa</span></div><div><strong>{formatNum(data.semesters.length)}</strong><span>Học kỳ</span></div><div><strong>{formatNum(data.courses.length)}</strong><span>Học phần</span></div></div></section>
                <section className="panel period-panel"><PanelHeader title="Tổng quan học kỳ" subtitle="Thông tin các học kỳ" icon={<CalendarDays size={18}/>} />{filteredSemesters.map((semester) => <div className="period-item" key={semester.semester_key}><div><strong>{semester.semester_code}</strong><small>{semester.academic_year} · {semester.total_classes} lớp</small></div><div className="period-value"><strong>{formatNum(semester.total_enrollments)}</strong><small>Lượt đăng ký</small></div></div>)}{filteredSemesters.length === 0 && <p className="empty-results">Không có học kỳ.</p>}</section>
                <section className="ai-panel"><div className="ai-panel-top"><span><Sparkles size={16}/> Trợ lý AI</span><span className="beta-pill">Sắp triển khai</span></div><h3>Trợ lý phân tích giáo dục</h3><p>Trong giai đoạn tiếp theo, chatbot sẽ sử dụng số liệu do backend cung cấp để hỗ trợ giải thích báo cáo.</p><button onClick={() => setInsightOpen(true)}>Khám phá kế hoạch <BrainCircuit size={16}/></button><div className="ai-orbit">✦</div></section>
              </aside>
            </div>
            <div className="dashboard-footer"><span>© 2026 EduInsight AI · Dữ liệu giáo dục mô phỏng</span><span>FastAPI + PostgreSQL + Next.js</span></div>
          </>}
        </div>
      {insightOpen && <div className="modal-backdrop" role="presentation" onClick={() => setInsightOpen(false)}><div className="insight-dialog" role="dialog" aria-modal="true" aria-labelledby="insight-title" onClick={(e) => e.stopPropagation()}><button className="modal-close" aria-label="Đóng" onClick={() => setInsightOpen(false)}><X size={19}/></button><div className="dialog-illustration"><BrainCircuit size={28}/></div><h2 id="insight-title">Trợ lý phân tích AI — sắp triển khai</h2><p>Giao diện tổng quan và các API phân tích đã sẵn sàng. Bước tiếp theo là kết nối AI Assistant với các kết quả phân tích được kiểm chứng từ backend.</p><button className="primary-button" onClick={() => setInsightOpen(false)}>Đã hiểu</button></div></div>}
    </AppShell>
  );
}

function Kpi({label,value,note,icon,variant}: {label:string;value:string;note:string;icon:ReactNode;variant:string}) {
  return <div className={`kpi-card kpi-${variant}`}><div className="kpi-top"><span>{label}</span><span className="kpi-icon">{icon}</span></div><strong>{value}</strong><small><TrendingUp size={13}/>{note}</small></div>;
}
function PanelHeader({title,subtitle,icon}: {title:string;subtitle:string;icon:ReactNode}) {
  return <div className="panel-heading"><div><h2>{icon}{title}</h2><p>{subtitle}</p></div><span className="panel-more"><BarChart3 size={16}/></span></div>;
}

function DeltaMetric({label,value,suffix}: {label:string;value:number|null;suffix:string}) {
  const textValue = value === null ? "—" : `${value > 0 ? "+" : ""}${value.toLocaleString("vi-VN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}${suffix}`;
  return <div className="delta-metric"><small>{label}</small><strong className={value === null ? "delta-neutral" : value > 0 ? "delta-up" : value < 0 ? "delta-down" : "delta-neutral"}>{textValue}</strong></div>;
}
