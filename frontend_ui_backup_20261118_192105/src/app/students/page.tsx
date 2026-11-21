"use client";

import AppShell from "@/components/layout/app-shell";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Database, Filter, GraduationCap,
  LayoutDashboard, Menu, RefreshCw, Search, ShieldAlert, Users, X } from "lucide-react";
import "./students.css";

// Map every style key to a namespaced global class.
const styles = new Proxy({} as Record<string, string>, {
  get: (_target, key) => `stu-${String(key)}`,
});

type Student = {
  student_code: string; full_name: string; admission_year: number; study_status: string;
  program_key: number; program_code: string; program_name: string;
  department_key: number; department_code: string; department_name: string;
};
type StudentList = { items: Student[]; total: number; page: number; page_size: number; total_pages: number };
type Department = { department_key: number; department_code: string; department_name: string };
type Program = { program_key: number; program_code: string; program_name: string; department_key: number };
type FilterData = { departments: Department[]; programs: Program[] };
type ApiResponse<T> = { status: string; data: T; error?: string };

const labels: Record<string, string> = {
  "Cong nghe thong tin": "Công nghệ thông tin", "Kinh te": "Kinh tế",
  "Ngoai ngu": "Ngoại ngữ", "Ky thuat": "Kỹ thuật", "Khoa hoc xa hoi": "Khoa học xã hội",
  active: "Đang học", graduated: "Đã tốt nghiệp", on_leave: "Bảo lưu",
};
const localize = (value: string) => labels[value] ?? value;
const format = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

export default function StudentsPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<StudentList | null>(null);
  const [filters, setFilters] = useState<FilterData>({ departments: [], programs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/students?view=filters", { signal: controller.signal, cache: "no-store" })
      .then(async (res) => { if (!res.ok) throw new Error("Không tải được bộ lọc"); return res.json() as Promise<ApiResponse<FilterData>>; })
      .then((json) => setFilters(json.data))
      .catch((err: unknown) => { if (!controller.signal.aborted) console.error(err); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), page_size: "12" });
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (department) params.set("department_key", department);
    if (program) params.set("program_key", program);
    if (status) params.set("status", status);
    setLoading(true);
    setError("");
    fetch(`/api/students?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const json: ApiResponse<StudentList> = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        return json.data;
      })
      .then((result) => setData(result))
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [debouncedQuery, department, program, status, page, refresh]);

  const availablePrograms = useMemo(() => filters.programs.filter(
    (item) => !department || String(item.department_key) === department,
  ), [filters, department]);
  const clear = () => { setQuery(""); setDebouncedQuery(""); setDepartment(""); setProgram(""); setStatus(""); setPage(1); };

  return (
    <AppShell>
      <main className="dashboard-content students-content">
          <div className={styles.heading}><div><p className={styles.eyebrow}>EDUINSIGHT AI / STUDENTS</p><h1>Student Management <span>✦</span></h1><p>Tra cứu và xem kết quả học tập từ Data Warehouse · Dữ liệu giả lập.</p></div><button className={styles.refresh} disabled={loading} onClick={() => setRefresh((v) => v + 1)}><RefreshCw size={16}/> Làm mới</button></div>
          <div className={styles.stats}>
            <div><span>Tổng kết quả</span><strong>{data ? format(data.total) : "—"}</strong><small>Theo bộ lọc đang chọn</small></div>
            <div><span>Trang hiện tại</span><strong>{data ? `${data.page} / ${data.total_pages}` : "—"}</strong><small>12 sinh viên mỗi trang</small></div>
            <div><span>Chế độ truy cập</span><strong className={styles.demoTag}>Demo</strong><small>Chưa có đăng nhập / RBAC</small></div>
          </div>
          <section className={styles.panel}>
            <div className={styles.panelHeading}><div><h2><Users size={19}/> Danh sách sinh viên</h2><p>Tìm theo họ tên hoặc mã sinh viên, lọc theo khoa, ngành và trạng thái.</p></div><span className={styles.count}>{data ? format(data.total) : "—"} hồ sơ</span></div>
            <div className={styles.filters}>
              <label className={styles.search}><Search size={17}/><input placeholder="Tìm mã hoặc tên sinh viên..." value={query} onChange={(e) => {setQuery(e.target.value);setPage(1);}} aria-label="Tìm sinh viên"/></label>
              <label><Filter size={15}/><select aria-label="Lọc khoa" value={department} onChange={(e) => {setDepartment(e.target.value);setProgram("");setPage(1);}}><option value="">Tất cả khoa</option>{filters.departments.map((d) => <option key={d.department_key} value={d.department_key}>{localize(d.department_name)}</option>)}</select></label>
              <label><select aria-label="Lọc ngành" value={program} onChange={(e) => {setProgram(e.target.value);setPage(1);}}><option value="">Tất cả ngành</option>{availablePrograms.map((p) => <option key={p.program_key} value={p.program_key}>{p.program_name}</option>)}</select></label>
              <label><select aria-label="Lọc trạng thái" value={status} onChange={(e) => {setStatus(e.target.value);setPage(1);}}><option value="">Mọi trạng thái</option><option value="active">Đang học</option><option value="graduated">Đã tốt nghiệp</option><option value="on_leave">Bảo lưu</option></select></label>
              <button type="button" onClick={clear} className={styles.clear}>Xóa lọc</button>
            </div>
            {error && <div role="alert" className={styles.error}>{error} <button onClick={() => setRefresh((v) => v + 1)}>Thử lại</button></div>}
            <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Mã SV</th><th>Họ và tên</th><th>Khoa</th><th>Ngành đào tạo</th><th>Khóa</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead><tbody>
              {data?.items.map((student) => <tr key={student.student_code}><td className={styles.code}>{student.student_code}</td><td><strong>{student.full_name}</strong></td><td>{localize(student.department_name)}</td><td>{student.program_name}</td><td>{student.admission_year}</td><td><span className={`${styles.status} ${student.study_status === "active" ? styles.statusActive : student.study_status === "graduated" ? styles.statusDone : styles.statusLeave}`}>{localize(student.study_status)}</span></td><td><Link className={styles.view} href={`/students/${encodeURIComponent(student.student_code)}`}>Xem <ArrowRight size={14}/></Link></td></tr>)}
              {loading && <tr><td colSpan={7} className={styles.empty}>Đang tải danh sách...</td></tr>}
              {!loading && !error && data?.items.length === 0 && <tr><td colSpan={7} className={styles.empty}>Không tìm thấy sinh viên phù hợp.</td></tr>}
            </tbody></table></div>
            <div className={styles.footer}><span>{data ? `Hiển thị ${format(data.items.length)} / ${format(data.total)} bản ghi` : "Đang kết nối..."}</span><div><button disabled={loading || page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}><ArrowLeft size={16}/></button><span>Trang {page}</span><button disabled={loading || page >= (data?.total_pages ?? 1)} onClick={() => setPage((v) => v + 1)}><ArrowRight size={16}/></button></div></div>
          </section>
          <p className={styles.disclaimer}><ShieldAlert size={16}/> Trang này chỉ dành cho thử nghiệm với dữ liệu giả lập. Phải triển khai đăng nhập và phân quyền trước khi sử dụng dữ liệu sinh viên thật.</p>
      </main>
    </AppShell>
  );
}
