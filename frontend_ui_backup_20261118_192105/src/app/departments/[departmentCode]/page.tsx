"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Building2, CalendarCheck2, ClipboardCheck, GraduationCap, RefreshCw, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppShell from "@/components/layout/app-shell";
import { type DepartmentPayload, courseAggregate, departmentName, fetchDepartmentPayload, vnMetric, vnNumber } from "@/lib/department-data";
import { type Course } from "@/lib/course-data";
import "../departments.css";

export default function DepartmentDetailPage() {
  const params = useParams<{ departmentCode: string }>();
  const code = params.departmentCode;
  const [data, setData] = useState<DepartmentPayload>({ departments: [], courses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetchDepartmentPayload(controller.signal)
      .then(v => { if (!controller.signal.aborted) { setData(v); setError(""); } })
      .catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Không tải được dữ liệu khoa"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshKey]);
  const department = data.departments.find(d => d.department_code === code);
  const courses = useMemo(() => data.courses.filter(c => c.department_code === code), [data.courses, code]);
  const stats = useMemo(() => courseAggregate(courses), [courses]);
  const filteredCourses = useMemo(() => courses.filter(c => `${c.course_code} ${c.course_name}`.toLocaleLowerCase("vi-VN").includes(search.trim().toLocaleLowerCase("vi-VN"))), [courses, search]);
  const gradeData = courses.filter(c => c.average_grade !== null).sort((a, b) => (b.average_grade ?? 0) - (a.average_grade ?? 0)).slice(0, 6).map(c => ({ code: c.course_code, grade: c.average_grade }));
  const retry = () => { setLoading(true); setRefreshKey(n => n + 1); };

  return <AppShell searchValue={search} onSearchChange={setSearch}>
    <main className="dashboard-content dept-content dept-profile">
      <Link className="dept-back" href="/departments"><ArrowLeft size={17}/> Quay lại danh sách khoa</Link>
      {loading && <section className="panel dept-empty">Đang tải hồ sơ khoa...</section>}
      {error && <div className="error-alert" role="alert"><span>{error}</span><button type="button" onClick={retry}>Thử lại</button></div>}
      {!loading && !error && !department && <section className="panel dept-missing"><h1>Không tìm thấy khoa</h1><p>Mã khoa này không tồn tại trong dữ liệu demo.</p><Link href="/departments" className="primary-button">Về danh sách khoa</Link></section>}
      {!loading && !error && department && <>
        <section className="dept-hero"><span className="dept-hero-icon"><Building2 size={28}/></span><div><p className="eyebrow">EDUINSIGHT AI / HỒ SƠ KHOA</p><h1>{departmentName(department.department_name)}</h1><p>Mã khoa: {department.department_code} · Thống kê từ Data Warehouse</p></div><button className="outline-button dept-hero-refresh" type="button" onClick={retry}><RefreshCw size={16}/> Làm mới</button></section>
        <section className="dept-kpis">
          <div className="dept-kpi"><span className="dept-kpi-icon blue"><Users size={19}/></span><small>Sinh viên hiện tại</small><strong>{vnNumber(department.total_students)}</strong><em>Theo ngành thuộc khoa</em></div>
          <div className="dept-kpi"><span className="dept-kpi-icon violet"><GraduationCap size={19}/></span><small>Giảng viên</small><strong>{vnNumber(department.total_instructors)}</strong><em>Được gắn với khoa</em></div>
          <div className="dept-kpi"><span className="dept-kpi-icon amber"><BookOpen size={19}/></span><small>Học phần</small><strong>{vnNumber(department.total_courses)}</strong><em>Danh mục của khoa</em></div>
          <div className="dept-kpi"><span className="dept-kpi-icon green"><CalendarCheck2 size={19}/></span><small>Lượt đăng ký</small><strong>{vnNumber(stats.totalEnrollments)}</strong><em>Trên các lớp thuộc khoa</em></div>
        </section>
        <div className="dept-detail-grid">
          <section className="panel"><div className="dept-section-head"><div><h2><GraduationCap size={18}/> Điểm theo học phần</h2><p>6 học phần có điểm trung bình bản ghi cao nhất.</p></div></div><div className="dept-chart dept-detail-chart">{gradeData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={gradeData} margin={{top:10,right:14,bottom:0,left:-20}}><CartesianGrid stroke="#ecf1f8" vertical={false} strokeDasharray="3 3"/><XAxis dataKey="code" tickLine={false} axisLine={false} tick={{fontSize:11,fill:"#8090a9"}}/><YAxis domain={[0,10]} tickLine={false} axisLine={false} tick={{fontSize:11,fill:"#8090a9"}}/><Tooltip formatter={v => [vnMetric(Number(v), " / 10"), "Điểm TB"]}/><Bar dataKey="grade" fill="#337cf1" radius={[6,6,0,0]} maxBarSize={42}/></BarChart></ResponsiveContainer> : <p className="dept-empty">Chưa có bản ghi điểm.</p>}</div></section>
          <section className="panel dept-performance"><div className="dept-section-head"><div><h2><ClipboardCheck size={18}/> Chỉ số học tập</h2><p>Tỷ lệ tính từ các bản ghi của học phần trong khoa.</p></div></div><div className="dept-performance-body">
            <div className="dept-performance-line"><span>Điểm trung bình / 10</span><strong>{vnMetric(stats.averageGrade)}</strong></div>
            <div className="dept-performance-line"><span>Hiện diện</span><strong>{vnMetric(stats.attendanceRate, "%")}</strong></div><div className="dept-meter"><span style={{width:`${Math.max(0, Math.min(100,stats.attendanceRate ?? 0))}%`}}/></div>
            <div className="dept-performance-line"><span>Nộp bài</span><strong>{vnMetric(stats.submissionRate, "%")}</strong></div><div className="dept-meter green"><span style={{width:`${Math.max(0, Math.min(100,stats.submissionRate ?? 0))}%`}}/></div>
            <div className="dept-separator"/><div className="dept-performance-line"><span>Lớp học phần</span><strong>{vnNumber(stats.totalClasses)}</strong></div><div className="dept-performance-line"><span>Bản ghi điểm</span><strong>{vnNumber(stats.gradeRecords)}</strong></div><div className="dept-performance-line"><span>Bản ghi chuyên cần</span><strong>{vnNumber(stats.attendanceRecords)}</strong></div>
          </div></section>
        </div>
        <section className="panel dept-list-panel"><div className="dept-section-head"><div><h2><BookOpen size={18}/> Danh sách học phần thuộc khoa</h2><p>Chọn một học phần để xem phân tích chi tiết.</p></div><span className="dept-count">{filteredCourses.length} học phần</span></div>
          <div className="dept-filters"><label className="dept-search"><span className="sr-only">Tìm học phần</span><input placeholder="Tìm mã hoặc tên học phần..." value={search} onChange={e => setSearch(e.target.value)}/></label></div>
          <div className="table-scroll"><table className="course-table dept-table"><thead><tr><th>Học phần</th><th>Tín chỉ</th><th>Lớp</th><th>Lượt đăng ký</th><th>Điểm TB</th><th>Hiện diện</th><th></th></tr></thead><tbody>{filteredCourses.map((c: Course) => <tr key={c.course_key}><td><Link className="dept-name" href={`/courses/${encodeURIComponent(c.course_code)}`}>{c.course_name}<small>{c.course_code}</small></Link></td><td>{vnMetric(c.credits)}</td><td>{vnNumber(c.total_classes)}</td><td>{vnNumber(c.total_enrollments)}</td><td>{vnMetric(c.average_grade)}</td><td>{vnMetric(c.attendance_rate, "%")}</td><td><Link className="dept-open" href={`/courses/${encodeURIComponent(c.course_code)}`} aria-label={`Mở ${c.course_code}`}><ArrowRight size={17}/></Link></td></tr>)}{!filteredCourses.length && <tr><td colSpan={7} className="dept-empty">Không có học phần phù hợp.</td></tr>}</tbody></table></div>
        </section>
        <p className="dept-footnote">Dữ liệu giả lập phục vụ phát triển. Điểm và các tỷ lệ tổng hợp theo bản ghi; không đại diện cho GPA hoặc đánh giá chất lượng đào tạo. Hệ thống chưa có xác thực, không dùng với dữ liệu sinh viên thật.</p>
      </>}
    </main>
  </AppShell>;
}
