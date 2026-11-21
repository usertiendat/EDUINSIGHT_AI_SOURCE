/* EduInsight AI / Phase 4.4 — server-only read model. No fabricated joins. */
export type ReportType = "overview" | "departments" | "courses" | "semesters";
export type ReportFilters = { type: ReportType; department: string; year: string; semester: string; q: string };
export type Cell = string | number | null;
export type Column = { key: string; label: string };
export type Report = {
  title: string;
  scope: string;
  description: string;
  columns: Column[];
  rows: Record<string, Cell>[];
  totals: { label: string; value: string }[];
  generatedAt: string;
  notice: string;
  filters: ReportFilters;
};

const API_BASE = process.env.FASTAPI_INTERNAL_URL ?? "http://127.0.0.1:8000";
const endpoints: Record<ReportType, string> = {
  overview: "overview", departments: "departments", courses: "courses", semesters: "semesters",
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Dữ liệu thống kê không hợp lệ.");
  return value as Record<string, unknown>;
}
function text(v: unknown): string { return typeof v === "string" ? v : ""; }
function num(v: unknown): number | null { return typeof v === "number" && Number.isFinite(v) ? v : null; }
function n(v: number | null): string { return v === null ? "—" : v.toLocaleString("vi-VN", { maximumFractionDigits: 2 }); }
const sum = (list: Record<string, unknown>[], key: string) => list.reduce((acc, row) => acc + (num(row[key]) ?? 0), 0);
const cols = (pairs: [string, string][]): Column[] => pairs.map(([key, label]) => ({ key, label }));
function normalized(v: string) { return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g,"d").toLocaleLowerCase("vi-VN"); }
function matches(row: Record<string, unknown>, keys: string[], q: string) {
  return !q || keys.some(k => normalized(text(row[k])).includes(normalized(q)));
}

export function parseFilters(search: URLSearchParams): ReportFilters {
  const type = search.get("type") ?? "overview";
  if (!(type in endpoints)) throw new RangeError("Loại báo cáo không hợp lệ.");
  const department = search.get("department") || "all";
  const year = search.get("year") || "all";
  const semester = search.get("semester") || "all";
  const q = (search.get("q") || "").trim();
  if ([department, year, semester].some(v => v.length > 100) || q.length > 120) throw new RangeError("Bộ lọc quá dài.");
  return { type: type as ReportType, department, year, semester, q };
}

async function loadAnalytics(type: ReportType, adminAuth: string): Promise<unknown> {
  const response = await fetch(`${API_BASE}/api/v1/analytics/${endpoints[type]}`, {
    headers:{Authorization:adminAuth}, cache: "no-store", signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(`FastAPI không phản hồi thành công (${response.status}).`);
  const envelope = record(await response.json());
  if (envelope.status !== "success" || !("data" in envelope)) throw new Error("Cấu trúc phản hồi FastAPI không hợp lệ.");
  return envelope.data;
}

const labels: Record<ReportType, [string, string]> = {
  overview: ["Báo cáo tổng quan đào tạo", "Thống kê toàn hệ thống, không có bộ lọc khoa hoặc học kỳ."],
  departments: ["Báo cáo theo khoa", "Số sinh viên hiện tại, giảng viên và học phần của từng khoa."],
  courses: ["Báo cáo học phần", "Thống kê học phần trên toàn bộ dữ liệu; lọc theo khoa quản lý học phần."],
  semesters: ["Báo cáo theo học kỳ", "Thống kê theo từng học kỳ; không thể suy ra số liệu khoa theo học kỳ từ API này."],
};

export async function buildReport(filters: ReportFilters, adminAuth: string): Promise<Report> {
  const raw = await loadAnalytics(filters.type, adminAuth);
  const common = {
    title: labels[filters.type][0], description: labels[filters.type][1],
    generatedAt: new Date().toISOString(),
    notice: "DỮ LIỆU MÔ PHỎNG — phục vụ nghiên cứu, không phải thống kê chính thức của Học viện Hàng không Việt Nam.",
    filters,
  };
  if (filters.type === "overview") {
    if (filters.department !== "all" || filters.year !== "all" || filters.semester !== "all" || filters.q) throw new RangeError("Báo cáo tổng quan không hỗ trợ lọc chi tiết.");
    const o = record(raw);
    const measures: [string, string, unknown, string][] = [
      ["total_students", "Sinh viên hiện tại", o.total_students, "người"],
      ["total_instructors", "Giảng viên", o.total_instructors, "người"],
      ["total_courses", "Học phần", o.total_courses, "học phần"],
      ["total_classes", "Lớp học phần", o.total_classes, "lớp"],
      ["total_enrollments", "Lượt đăng ký", o.total_enrollments, "lượt"],
      ["average_grade", "Điểm trung bình", o.average_grade, "/10"],
      ["attendance_rate", "Tỷ lệ chuyên cần", o.attendance_rate, "%"],
      ["assignment_submission_rate", "Tỷ lệ nộp bài", o.assignment_submission_rate, "%"],
    ];
    for (const [key,,v] of measures) if (v !== null && num(v) === null) throw new Error(`Thiếu hoặc sai chỉ số ${key}.`);
    return { ...common, scope: "Toàn hệ thống", columns: cols([["name","Chỉ số"],["value","Giá trị"],["unit","Đơn vị"]]),
      rows: measures.map(([, name, value, unit]) => ({ name, value: num(value), unit })),
      totals: [{ label: "Tổng sinh viên hiện tại", value: n(num(o.total_students)) }, {label:"Điểm trung bình", value:n(num(o.average_grade))}],
    };
  }
  if (!Array.isArray(raw)) throw new Error("API không trả về danh sách thống kê.");
  const records = raw.map(record);
  if (filters.type === "departments") {
    if (filters.department !== "all" || filters.year !== "all" || filters.semester !== "all") throw new RangeError("Báo cáo khoa chỉ hỗ trợ tìm kiếm theo tên/mã khoa.");
    const rows = records.filter(r => matches(r,["department_code","department_name"],filters.q)).map(r => ({
      department_code: text(r.department_code), department_name: text(r.department_name), total_students: num(r.total_students),
      total_courses: num(r.total_courses), total_instructors: num(r.total_instructors),
    }));
    if (rows.some(r => !r.department_code || !r.department_name || r.total_students === null || r.total_courses === null || r.total_instructors === null)) throw new Error("Dữ liệu khoa thiếu trường bắt buộc.");
    return {...common, scope: filters.q ? `Tìm kiếm: ${filters.q}` : "Tất cả khoa", columns: cols([
      ["department_code","Mã khoa"],["department_name","Tên khoa"],["total_students","Sinh viên hiện tại"],
      ["total_courses","Học phần"],["total_instructors","Giảng viên"],
    ]), rows, totals: [{label:"Số khoa",value:n(rows.length)},{label:"Sinh viên theo khoa",value:n(rows.reduce((a,r)=>a+(r.total_students??0),0))}]};
  }
  if (filters.type === "courses") {
    if (filters.year !== "all" || filters.semester !== "all") throw new RangeError("API học phần hiện chưa hỗ trợ lọc theo học kỳ.");
    const deptCodes = new Set(records.map(r=>text(r.department_code)));
    if (filters.department !== "all" && !deptCodes.has(filters.department)) throw new RangeError("Khoa không tồn tại trong dữ liệu học phần.");
    const selected = records.filter(r => (filters.department === "all" || r.department_code === filters.department) && matches(r,["course_code","course_name","department_name"],filters.q));
    const rows = selected.map(r => ({
      course_code: text(r.course_code), course_name: text(r.course_name), department_name: text(r.department_name),
      credits: num(r.credits), total_classes: num(r.total_classes), total_students: num(r.total_students),
      total_enrollments: num(r.total_enrollments), average_grade: num(r.average_grade),
      attendance_rate: num(r.attendance_rate), assignment_submission_rate: num(r.assignment_submission_rate),
    }));
    if (rows.some(r=>!r.course_code||!r.course_name||!r.department_name||r.credits === null||r.total_classes===null||r.total_students===null||r.total_enrollments===null)) throw new Error("Dữ liệu học phần thiếu trường bắt buộc.");
    const foundDept = records.find(r=>r.department_code===filters.department);
    return {...common, scope: [filters.department === "all" ? "Tất cả khoa" : `Khoa: ${text(foundDept?.department_name)}`, filters.q ? `Tìm kiếm: ${filters.q}` : ""].filter(Boolean).join(" · "),
      columns: cols([["course_code","Mã học phần"],["course_name","Tên học phần"],["department_name","Khoa"],
        ["credits","Tín chỉ"],["total_classes","Lớp"],["total_students","SV trong học phần"],["total_enrollments","Lượt đăng ký"],
        ["average_grade","Điểm TB /10"],["attendance_rate","Chuyên cần (%)"],["assignment_submission_rate","Nộp bài (%)"]]),
      rows, totals: [{label:"Số học phần",value:n(rows.length)},{label:"Lượt đăng ký",value:n(rows.reduce((a,r)=>a+(r.total_enrollments??0),0))}],
    };
  }
  if (filters.type === "semesters") {
    if (filters.department !== "all") throw new RangeError("API không hỗ trợ báo cáo khoa theo học kỳ.");
    const years = new Set(records.map(r=>text(r.academic_year)));
    const codes = new Set(records.map(r=>text(r.semester_code)));
    if (filters.year !== "all" && !years.has(filters.year)) throw new RangeError("Năm học không tồn tại.");
    if (filters.semester !== "all" && !codes.has(filters.semester)) throw new RangeError("Học kỳ không tồn tại.");
    const selected = records.filter(r => (filters.year==="all"||r.academic_year===filters.year) && (filters.semester==="all"||r.semester_code===filters.semester) && matches(r,["semester_code","academic_year","semester_name"],filters.q));
    const rows = selected.map(r => ({
      semester_code:text(r.semester_code), academic_year:text(r.academic_year), total_classes:num(r.total_classes),
      total_students:num(r.total_students), total_enrollments:num(r.total_enrollments),
      average_grade:num(r.average_grade), attendance_rate:num(r.attendance_rate), assignment_submission_rate:num(r.assignment_submission_rate),
    }));
    if (rows.some(r=>!r.semester_code||!r.academic_year||r.total_classes===null||r.total_students===null||r.total_enrollments===null)) throw new Error("Dữ liệu học kỳ thiếu trường bắt buộc.");
    return {...common, scope: [filters.year==="all"?"Tất cả năm học":`Năm học ${filters.year}`, filters.semester==="all"?"Tất cả học kỳ":`Học kỳ ${filters.semester}`, filters.q?`Tìm kiếm: ${filters.q}`:""].filter(Boolean).join(" · "),
      columns:cols([["semester_code","Mã học kỳ"],["academic_year","Năm học"],["total_classes","Lớp học phần"],
        ["total_students","SV riêng biệt trong kỳ"],["total_enrollments","Lượt đăng ký"],["average_grade","Điểm TB /10"],
        ["attendance_rate","Chuyên cần (%)"],["assignment_submission_rate","Nộp bài (%)"]]),
      rows,totals:[{label:"Số học kỳ",value:n(rows.length)},{label:"Tổng lượt đăng ký",value:n(rows.reduce((a,r)=>a+(r.total_enrollments??0),0))}],
    };
  }
  throw new RangeError("Loại báo cáo không hợp lệ.");
}

export function reportTitle(type: ReportType) { return labels[type][0]; }
export function allDataForOptions(type:ReportType, adminAuth:string) { return loadAnalytics(type, adminAuth); }
