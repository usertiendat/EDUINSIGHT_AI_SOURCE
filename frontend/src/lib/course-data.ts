export type Course = {
  course_key: number;
  course_code: string;
  course_name: string;
  credits: number;
  department_code: string;
  department_name: string;
  total_classes: number;
  total_students: number;
  total_enrollments: number;
  total_grade_records: number;
  average_grade: number | null;
  total_attendance_records: number;
  attendance_rate: number | null;
  total_assignments: number;
  assignment_submission_rate: number | null;
};

export const departmentLabel = (value: string) => ({
  "Cong nghe thong tin": "Công nghệ thông tin",
  "Kinh te": "Kinh tế",
  "Ngoai ngu": "Ngoại ngữ",
  "Ky thuat": "Kỹ thuật",
  "Khoa hoc xa hoi": "Khoa học xã hội",
} as Record<string, string>)[value] ?? value;
export const numberText = (n: number) => new Intl.NumberFormat("vi-VN").format(n);
export const metricText = (n: number | null | undefined, suffix = "") =>
  n == null ? "—" : `${n.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}${suffix}`;

export async function fetchCourses(signal?: AbortSignal): Promise<Course[]> {
  const response = await fetch("/api/courses", { cache: "no-store", signal });
  const payload: unknown = await response.json();
  if (!response.ok) throw new Error("Không thể kết nối dữ liệu học phần. Kiểm tra FastAPI ở cổng 8000.");
  if (!payload || typeof payload !== "object" || !("data" in payload) || !Array.isArray(payload.data)) {
    throw new Error("Dữ liệu học phần không đúng định dạng.");
  }
  return payload.data as Course[];
}

export function saveCoursesCsv(courses: Course[]) {
  const headings = ["Mã học phần", "Học phần", "Khoa", "Tín chỉ", "Lớp", "SV duy nhất", "Lượt đăng ký", "Điểm TB /10", "Hiện diện %", "Nộp bài %"];
  const contents = courses.map((c) => [c.course_code, c.course_name, departmentLabel(c.department_name), c.credits, c.total_classes, c.total_students, c.total_enrollments, c.average_grade ?? "", c.attendance_rate ?? "", c.assignment_submission_rate ?? ""]);
  const escape = (cell: string | number) => `"${String(cell).replaceAll('"', '""')}"`;
  const csv = [headings, ...contents].map((row) => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], {type: "text/csv;charset=utf-8"}));
  const a = document.createElement("a"); a.href = url; a.download = "eduinsight-course-report.csv"; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
