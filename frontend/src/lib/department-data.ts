import type { Course } from "@/lib/course-data";

export type Department = {
  department_key: number;
  department_code: string;
  department_name: string;
  total_students: number;
  total_courses: number;
  total_instructors: number;
};
export type DepartmentPayload = { departments: Department[]; courses: Course[] };

export const departmentName = (value: string) => ({
  "Cong nghe thong tin": "Công nghệ thông tin",
  "Kinh te": "Kinh tế",
  "Ngoai ngu": "Ngoại ngữ",
  "Ky thuat": "Kỹ thuật",
  "Khoa hoc xa hoi": "Khoa học xã hội",
} as Record<string, string>)[value] ?? value;

export const vnNumber = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
export const vnMetric = (value: number | null | undefined, suffix = "") =>
  value == null ? "—" : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}${suffix}`;

export async function fetchDepartmentPayload(signal?: AbortSignal): Promise<DepartmentPayload> {
  const response = await fetch("/api/departments", { cache: "no-store", signal });
  if (!response.ok) throw new Error("Không tải được dữ liệu khoa. Kiểm tra FastAPI ở cổng 8000.");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("departments" in body) || !("courses" in body)) {
    throw new Error("API trả về dữ liệu khoa không hợp lệ.");
  }
  const result = body as { departments: unknown; courses: unknown };
  if (!Array.isArray(result.departments) || !Array.isArray(result.courses)) {
    throw new Error("Danh sách khoa hoặc học phần có định dạng không hợp lệ.");
  }
  return { departments: result.departments as Department[], courses: result.courses as Course[] };
}

export function courseAggregate(courses: Course[]) {
  const totalClasses = courses.reduce((s, c) => s + c.total_classes, 0);
  const totalEnrollments = courses.reduce((s, c) => s + c.total_enrollments, 0);
  const gradeRecords = courses.reduce((s, c) => s + c.total_grade_records, 0);
  const attendanceRecords = courses.reduce((s, c) => s + c.total_attendance_records, 0);
  const assignments = courses.reduce((s, c) => s + c.total_assignments, 0);
  const weighted = (count: (c: Course) => number, metric: (c: Course) => number | null) => {
    const applicable = courses.filter(c => metric(c) !== null && count(c) > 0);
    const denominator = applicable.reduce((s, c) => s + count(c), 0);
    return denominator ? applicable.reduce((s, c) => s + count(c) * (metric(c) ?? 0), 0) / denominator : null;
  };
  return {
    totalClasses, totalEnrollments, gradeRecords, attendanceRecords, assignments,
    averageGrade: weighted(c => c.total_grade_records, c => c.average_grade),
    attendanceRate: weighted(c => c.total_attendance_records, c => c.attendance_rate),
    submissionRate: weighted(c => c.total_assignments, c => c.assignment_submission_rate),
  };
}

export function downloadDepartmentCsv(departments: Department[]) {
  const rows: (string | number)[][] = [["Mã khoa", "Tên khoa", "Sinh viên hiện tại", "Học phần", "Giảng viên"],
    ...departments.map(d => [d.department_code, departmentName(d.department_name), d.total_students, d.total_courses, d.total_instructors])];
  const quote = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const blob = new Blob(["\uFEFF", rows.map(r => r.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = "eduinsight-departments.csv"; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
