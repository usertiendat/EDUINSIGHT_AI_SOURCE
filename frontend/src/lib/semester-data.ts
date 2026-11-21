export type Semester = {
  semester_key: number;
  semester_code: string;
  academic_year: string;
  start_date?: string | null;
  semester_name?: string | null;
  total_classes: number;
  total_students: number;
  total_enrollments: number;
  average_grade: number | null;
  attendance_rate: number | null;
  assignment_submission_rate: number | null;
};

const required = ["total_classes", "total_students", "total_enrollments"] as const;
const optional = ["average_grade", "attendance_rate", "assignment_submission_rate"] as const;

export function parseSemesters(value: unknown): Semester[] {
  if (!Array.isArray(value)) throw new Error("Danh sách học kỳ có định dạng không hợp lệ.");
  const parsed: Semester[] = value.map((row, index) => {
    if (!row || typeof row !== "object") throw new Error(`Bản ghi học kỳ ${index + 1} không hợp lệ.`);
    const r = row as Record<string, unknown>;
    if (typeof r.semester_code !== "string" || !r.semester_code.trim() ||
        typeof r.academic_year !== "string" ||
        typeof r.semester_key !== "number" || !Number.isFinite(r.semester_key)) {
      throw new Error(`Bản ghi học kỳ ${index + 1} thiếu mã hoặc năm học.`);
    }
    for (const key of required) {
      if (typeof r[key] !== "number" || !Number.isFinite(r[key]) || r[key] < 0) {
        throw new Error(`Số liệu ${key} không hợp lệ ở học kỳ ${r.semester_code}.`);
      }
    }
    for (const key of optional) {
      if (r[key] !== null && (typeof r[key] !== "number" || !Number.isFinite(r[key]) || r[key] < 0 || r[key] > (key === "average_grade" ? 10 : 100))) {
        throw new Error(`Số liệu ${key} không hợp lệ ở học kỳ ${r.semester_code}.`);
      }
    }
    return r as Semester;
  });
  const ids = new Set(parsed.map(x => x.semester_code));
  if (ids.size !== parsed.length) throw new Error("API có mã học kỳ bị trùng lặp.");
  // Backend supplies start_date. Use it when both records have valid dates; otherwise fall back to natural semester-code ordering.
  return parsed.sort((a, b) => {
    const aDate = a.start_date && /^\d{4}-\d{2}-\d{2}$/.test(a.start_date) ? a.start_date : null;
    const bDate = b.start_date && /^\d{4}-\d{2}-\d{2}$/.test(b.start_date) ? b.start_date : null;
    return aDate && bDate && aDate !== bDate ? aDate.localeCompare(bDate) : a.semester_code.localeCompare(b.semester_code, "vi", { numeric: true });
  });
}

export async function fetchSemesters(signal?: AbortSignal): Promise<Semester[]> {
  const response = await fetch("/api/semesters", { cache: "no-store", signal });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const description = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error : "Không thể kết nối API học kỳ.";
    throw new Error(description);
  }
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !("semesters" in payload)) {
    throw new Error("API trả về dữ liệu học kỳ không hợp lệ.");
  }
  return parseSemesters(payload.semesters);
}

export const vnNumber = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
export const metric = (n: number | null | undefined, suffix = "") =>
  n == null ? "—" : `${n.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
export const delta = (first: number | null, last: number | null) =>
  first === null || last === null ? null : last - first;

function safeCsvCell(v: string | number | null) {
  // Prevent spreadsheet formula execution when CSV is opened in Excel.
  const raw = String(v ?? "");
  const neutral = /^[\s]*[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${neutral.replaceAll('"', '""')}"`;
}
export function downloadSemesterCsv(rows: Semester[], name: string) {
  const headers = ["Mã học kỳ", "Năm học", "Số lớp", "Số sinh viên trong kỳ", "Lượt đăng ký", "Điểm TB (thang 10)", "Chuyên cần (%)", "Nộp bài (%)"];
  const values = rows.map(s => [s.semester_code, s.academic_year, s.total_classes, s.total_students, s.total_enrollments, s.average_grade, s.attendance_rate, s.assignment_submission_rate]);
  const csv = [headers, ...values].map(row => row.map(safeCsvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
