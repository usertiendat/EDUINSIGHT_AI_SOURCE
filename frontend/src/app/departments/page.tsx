"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, Building2, BookOpen, GraduationCap, RefreshCw, Search, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppShell from "@/components/layout/app-shell";
import { type Department, type DepartmentPayload, departmentName, downloadDepartmentCsv, fetchDepartmentPayload, vnNumber } from "@/lib/department-data";
import "./departments.css";

export default function DepartmentsPage() {
  const [data, setData] = useState<DepartmentPayload>({ departments: [], courses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("students");

  useEffect(() => {
    const controller = new AbortController();
    fetchDepartmentPayload(controller.signal)
      .then(v => { if (!controller.signal.aborted) { setData(v); setError(""); } })
      .catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Không thể tải dữ liệu"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("vi-VN");
    return data.departments.filter(d => !q || [d.department_code, d.department_name, departmentName(d.department_name)].some(s => s.toLocaleLowerCase("vi-VN").includes(q)))
      .sort((a, b) => sort === "name" ? departmentName(a.department_name).localeCompare(departmentName(b.department_name), "vi") :
        sort === "courses" ? b.total_courses - a.total_courses || a.department_key - b.department_key :
        sort === "instructors" ? b.total_instructors - a.total_instructors || a.department_key - b.department_key :
        b.total_students - a.total_students || a.department_key - b.department_key);
  }, [data.departments, query, sort]);
  const students = data.departments.reduce((sum, d) => sum + d.total_students, 0);
  const instructors = data.departments.reduce((sum, d) => sum + d.total_instructors, 0);
  const courses = data.departments.reduce((sum, d) => sum + d.total_courses, 0);
  const retry = () => { setLoading(true); setRefreshKey(v => v + 1); };
  const chart = filtered.map(d => ({ label: departmentName(d.department_name), students: d.total_students }));
  const chartHeight = Math.max(260, chart.length * 45 + 30);

  return <AppShell searchValue={query} onSearchChange={setQuery}>
    <main className="dashboard-content dept-content">
      <section className="dept-heading">
        <div><p className="eyebrow">EDUINSIGHT AI / QUẢN LÝ KHOA</p><h1>Quản lý khoa <span className="dept-accent">✦</span></h1>
          <p className="page-subtitle">Cơ cấu khoa, sinh viên, giảng viên và học phần · Dữ liệu đại học giả lập.</p></div>
        <div className="dept-actions"><button className="outline-button" type="button" onClick={retry} disabled={loading}><RefreshCw size={16}/> Làm mới</button>
          <button className="primary-button" type="button" onClick={() => downloadDepartmentCsv(filtered)} disabled={loading || !filtered.length}><ArrowDownToLine size={16}/> Xuất CSV</button></div>
      </section>
      {error && <div className="error-alert" role="alert"><span>{error}</span><button type="button" onClick={retry}>Thử lại</button></div>}
      <section className="dept-kpis" aria-label="Tổng quan các khoa">
        <div className="dept-kpi"><span className="dept-kpi-icon blue"><Building2 size={19}/></span><small>Số khoa</small><strong>{loading ? "—" : vnNumber(data.departments.length)}</strong><em>Đơn vị đào tạo</em></div>
        <div className="dept-kpi"><span className="dept-kpi-icon green"><Users size={19}/></span><small>Sinh viên hiện tại</small><strong>{loading ? "—" : vnNumber(students)}</strong><em>Không đếm phiên bản lịch sử</em></div>
        <div className="dept-kpi"><span className="dept-kpi-icon violet"><GraduationCap size={19}/></span><small>Giảng viên</small><strong>{loading ? "—" : vnNumber(instructors)}</strong><em>Được gắn với khoa</em></div>
        <div className="dept-kpi"><span className="dept-kpi-icon amber"><BookOpen size={19}/></span><small>Học phần</small><strong>{loading ? "—" : vnNumber(courses)}</strong><em>Được quản lý bởi khoa</em></div>
      </section>
      <div className="dept-overview-grid">
        <section className="panel dept-chart-panel"><div className="dept-section-head"><div><h2><Users size={18}/> Sinh viên theo khoa</h2><p>Phân bố sinh viên ở phiên bản hồ sơ hiện tại.</p></div><span className="dept-count">{filtered.length} khoa</span></div>
          <div className="dept-chart" style={{height:chartHeight}}>{loading ? <div className="dept-empty">Đang tải biểu đồ...</div> : filtered.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chart} layout="vertical" margin={{ top: 10, right: 20, bottom: 12, left: 2 }}><CartesianGrid stroke="#edf1f8" horizontal={false} strokeDasharray="3 3"/><XAxis type="number" allowDecimals={false} tick={{fontSize: 11, fill: "#8b99b0"}} tickLine={false} axisLine={false}/><YAxis type="category" dataKey="label" interval={0} width={175} tick={{fontSize: 11, fill: "#52627c"}} tickLine={false} axisLine={false}/><Tooltip formatter={(v) => [vnNumber(Number(v ?? 0)), "Sinh viên"]} contentStyle={{borderRadius: 10, borderColor: "#e5eaf3"}}/><Bar dataKey="students" fill="#3579f1" radius={[0,6,6,0]} maxBarSize={23}/></BarChart></ResponsiveContainer> : <div className="dept-empty">Không tìm thấy khoa phù hợp.</div>}</div>
        </section>
        <section className="panel dept-summary"><div className="dept-section-head"><div><h2><Building2 size={18}/> Cơ cấu đào tạo</h2><p>Phân bổ học phần và giảng viên theo khoa.</p></div></div>
          <div className="dept-summary-list">{filtered.map(d => <Link href={`/departments/${encodeURIComponent(d.department_code)}`} key={d.department_code}><span className="dept-list-code">{d.department_code}</span><span className="dept-list-name">{departmentName(d.department_name)}<small>{d.total_courses} học phần · {d.total_instructors} giảng viên</small></span><ArrowRight size={15}/></Link>)}{!loading && !filtered.length && <p className="dept-empty">Chưa có kết quả.</p>}</div>
        </section>
      </div>
      <section className="panel dept-list-panel"><div className="dept-section-head"><div><h2><Building2 size={18}/> Danh sách khoa</h2><p>Tìm kiếm và chọn khoa để xem phân tích chi tiết.</p></div><span className="dept-count">{filtered.length} kết quả</span></div>
        <div className="dept-filters"><label className="dept-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tên khoa hoặc mã khoa..." aria-label="Tìm khoa"/></label><label><span className="sr-only">Sắp xếp</span><select aria-label="Sắp xếp khoa" value={sort} onChange={e => setSort(e.target.value)}><option value="students">Sinh viên nhiều nhất</option><option value="courses">Học phần nhiều nhất</option><option value="instructors">Giảng viên nhiều nhất</option><option value="name">Tên khoa A–Z</option></select></label></div>
        <div className="table-scroll"><table className="course-table dept-table"><thead><tr><th>Mã khoa</th><th>Tên khoa</th><th>Sinh viên</th><th>Học phần</th><th>Giảng viên</th><th></th></tr></thead><tbody>
          {filtered.map((d: Department) => <tr key={d.department_key}><td><span className="dept-code">{d.department_code}</span></td><td><Link href={`/departments/${encodeURIComponent(d.department_code)}`} className="dept-name">{departmentName(d.department_name)}</Link></td><td>{vnNumber(d.total_students)}</td><td>{vnNumber(d.total_courses)}</td><td>{vnNumber(d.total_instructors)}</td><td><Link className="dept-open" href={`/departments/${encodeURIComponent(d.department_code)}`} aria-label={`Xem ${departmentName(d.department_name)}`}><ArrowRight size={17}/></Link></td></tr>)}
          {loading && <tr><td colSpan={6} className="dept-empty">Đang tải danh sách khoa...</td></tr>}
          {!loading && !filtered.length && <tr><td colSpan={6} className="dept-empty">Không tìm thấy khoa phù hợp.</td></tr>}
        </tbody></table></div>
      </section>
      <p className="dept-footnote">Chỉ dùng dữ liệu giả lập. Số sinh viên là tổng các khoa ở phiên bản hồ sơ hiện tại; không phải tổng lượt đăng ký học phần.</p>
    </main>
  </AppShell>;
}
