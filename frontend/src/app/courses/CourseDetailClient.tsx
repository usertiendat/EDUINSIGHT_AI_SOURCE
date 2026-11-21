"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, BookOpen, ChevronLeft, ChevronRight, GraduationCap, Layers3, RefreshCw, Search, SlidersHorizontal, Users } from "lucide-react";
import AppShell from "@/components/layout/app-shell";
import { type Course, departmentLabel, fetchCourses, metricText, numberText, saveCoursesCsv } from "@/lib/course-data";
import "./courses.css";

const PAGE_SIZE = 10;
type Sort = "code" | "students" | "grade" | "attendance";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [sort, setSort] = useState<Sort>("code");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    fetchCourses(controller.signal)
      .then((items) => setCourses(items))
      .catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Có lỗi khi tải dữ liệu"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  const departments = useMemo(() => Array.from(new Set(courses.map(c => c.department_name))).sort(), [courses]);
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("vi-VN");
    const items = courses.filter(c => (department === "all" || c.department_name === department) &&
      (!q || [c.course_code, c.course_name, c.department_name, departmentLabel(c.department_name)].some(v => v.toLocaleLowerCase("vi-VN").includes(q))));
    return [...items].sort((a, b) => {
      if (sort === "students") return b.total_students - a.total_students || a.course_code.localeCompare(b.course_code);
      if (sort === "grade") return (b.average_grade ?? -1) - (a.average_grade ?? -1) || a.course_code.localeCompare(b.course_code);
      if (sort === "attendance") return (b.attendance_rate ?? -1) - (a.attendance_rate ?? -1) || a.course_code.localeCompare(b.course_code);
      return a.course_code.localeCompare(b.course_code);
    });
  }, [courses, department, search, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const current = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const setFilter = (value: string) => { setDepartment(value); setPage(1); };
  const totalClasses = courses.reduce((sum, c) => sum + c.total_classes, 0);
  const totalEnrollments = courses.reduce((sum, c) => sum + c.total_enrollments, 0);

  return <AppShell searchValue={search} onSearchChange={value => { setSearch(value); setPage(1); }}>
    <main className="dashboard-content course-content">
      <section className="course-heading">
        <div><p className="eyebrow">EDUINSIGHT AI / QUẢN LÝ HỌC PHẦN</p>
          <h1>Quản lý học phần <span className="course-sparkle">✦</span></h1>
          <p className="page-subtitle">Danh mục học phần và kết quả phân tích trực tiếp từ kho dữ liệu · Dữ liệu giả lập.</p></div>
        <div className="course-actions">
          <button type="button" className="outline-button" disabled={loading} onClick={() => setRefresh(x => x + 1)}><RefreshCw size={16}/> Làm mới</button>
          <button type="button" className="primary-button" disabled={loading || filtered.length === 0} onClick={() => saveCoursesCsv(filtered)}><ArrowDownToLine size={16}/> Xuất CSV</button>
        </div>
      </section>
      {error && <div role="alert" className="error-alert"><span>{error}</span><button type="button" onClick={() => setRefresh(x => x + 1)}>Thử lại</button></div>}
      <section className="course-stats" aria-label="Thống kê học phần">
        <div className="course-stat"><span className="course-stat-icon blue"><BookOpen size={20}/></span><small>Học phần</small><strong>{loading ? "—" : numberText(courses.length)}</strong><em>Danh mục đào tạo</em></div>
        <div className="course-stat"><span className="course-stat-icon violet"><Layers3 size={20}/></span><small>Lớp học phần</small><strong>{loading ? "—" : numberText(totalClasses)}</strong><em>Trên tất cả học kỳ</em></div>
        <div className="course-stat"><span className="course-stat-icon green"><Users size={20}/></span><small>Lượt đăng ký</small><strong>{loading ? "—" : numberText(totalEnrollments)}</strong><em>Không phải sinh viên duy nhất</em></div>
        <div className="course-stat"><span className="course-stat-icon amber"><GraduationCap size={20}/></span><small>Số khoa</small><strong>{loading ? "—" : numberText(departments.length)}</strong><em>Đang có học phần</em></div>
      </section>
      <section className="panel course-management-panel">
        <div className="course-section-head"><div><h2><BookOpen size={19}/> Danh sách học phần</h2><p>Tìm kiếm, lọc và mở trang phân tích của từng học phần.</p></div><span className="course-count">{numberText(filtered.length)} kết quả</span></div>
        <div className="course-filters">
          <label className="course-search"><Search size={17}/><input aria-label="Tìm học phần" placeholder="Tìm tên học phần, mã, khoa..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></label>
          <label><SlidersHorizontal size={16}/><span className="sr-only">Khoa</span><select aria-label="Lọc theo khoa" value={department} onChange={e => setFilter(e.target.value)}><option value="all">Tất cả các khoa</option>{departments.map(name => <option key={name} value={name}>{departmentLabel(name)}</option>)}</select></label>
          <label><span className="sr-only">Sắp xếp</span><select aria-label="Sắp xếp học phần" value={sort} onChange={e => { setSort(e.target.value as Sort); setPage(1); }}><option value="code">Theo mã học phần</option><option value="students">Sinh viên nhiều nhất</option><option value="grade">Điểm trung bình cao nhất</option><option value="attendance">Hiện diện cao nhất</option></select></label>
        </div>
        <div className="table-scroll"><table className="course-table course-management-table"><thead><tr><th>Học phần</th><th>Khoa</th><th>Tín chỉ</th><th>Lớp</th><th>SV duy nhất</th><th>Điểm TB</th><th>Hiện diện</th><th></th></tr></thead><tbody>
          {current.map(c => <tr key={c.course_key}><td><Link href={`/courses/${encodeURIComponent(c.course_code)}`} className="course-name-link"><strong>{c.course_name}</strong><span>{c.course_code}</span></Link></td><td>{departmentLabel(c.department_name)}</td><td>{metricText(c.credits)}</td><td>{numberText(c.total_classes)}</td><td>{numberText(c.total_students)}</td><td><span className="metric-grade">{metricText(c.average_grade)}</span></td><td><span className="course-rate">{metricText(c.attendance_rate, "%")}</span></td><td><Link aria-label={`Xem chi tiết ${c.course_code}`} className="course-row-arrow" href={`/courses/${encodeURIComponent(c.course_code)}`}><ArrowRight size={17}/></Link></td></tr>)}
          {!loading && current.length === 0 && <tr><td colSpan={8} className="course-empty">Không tìm thấy học phần phù hợp. Hãy đổi bộ lọc.</td></tr>}
          {loading && <tr><td colSpan={8} className="course-empty">Đang tải dữ liệu học phần...</td></tr>}
        </tbody></table></div>
        <div className="course-pagination"><span>Hiển thị {filtered.length ? (safePage-1)*PAGE_SIZE+1 : 0}–{Math.min(safePage*PAGE_SIZE, filtered.length)} / {filtered.length} học phần</span><div><button type="button" disabled={safePage<=1} aria-label="Trang trước" onClick={() => setPage(safePage-1)}><ChevronLeft size={17}/></button><span>Trang {safePage} / {pages}</span><button type="button" disabled={safePage>=pages} aria-label="Trang tiếp" onClick={() => setPage(safePage+1)}><ChevronRight size={17}/></button></div></div>
      </section>
      <p className="course-footnote">Số sinh viên duy nhất được tính trong phạm vi từng học phần; các điểm số là trung bình bản ghi đánh giá quy đổi về thang 10, không phải GPA chính thức.</p>
    </main>
  </AppShell>;
}
