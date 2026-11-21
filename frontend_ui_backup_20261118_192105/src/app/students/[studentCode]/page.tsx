"use client";

import AppShell from "@/components/layout/app-shell";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, GraduationCap, ShieldAlert, Users } from "lucide-react";
import "../students.css";

// Map every style key to a namespaced global class.
const styles = new Proxy({} as Record<string, string>, {
  get: (_target, key) => `stu-${String(key)}`,
});

type Student = {
  student_code: string; full_name: string; admission_year: number; study_status: string;
  program_name: string; department_name: string; effective_from: string;
};
type Overview = { enrollments: number; average_grade: number | null; attendance_rate: number | null; assignment_submission_rate: number | null };
type Course = { class_key: number; class_code: string; course_code: string; course_name: string; semester_code: string; enrollment_status: string; average_grade: number | null };
type StudentDetail = { student: Student; overview: Overview; courses: Course[]; courses_truncated: boolean };
const departmentLabels: Record<string, string> = { "Cong nghe thong tin": "Công nghệ thông tin", "Kinh te": "Kinh tế", "Ngoai ngu": "Ngoại ngữ", "Ky thuat": "Kỹ thuật", "Khoa hoc xa hoi": "Khoa học xã hội" };
const statusLabels: Record<string, string> = { active: "Đang học", graduated: "Đã tốt nghiệp", on_leave: "Bảo lưu" };
const metric = (value: number | null, suffix = "") => value === null ? "—" : `${value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}${suffix}`;

export default function StudentDetailPage() {
  const params = useParams<{ studentCode: string }>();
  const code = params.studentCode;
  const [record, setRecord] = useState<StudentDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/students/${encodeURIComponent(code)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(response.status === 404 ? "Không tìm thấy sinh viên." : json.error ?? "Lỗi tải hồ sơ");
        return json.data as StudentDetail;
      })
      .then(setRecord)
      .catch((e: unknown) => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Có lỗi xảy ra"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [code]);

  return <AppShell><main className={`${styles.detailPage} students-detail-content`}>
    <div className={styles.detailInner}>
      <Link href="/students" className={styles.back}><ArrowLeft size={17}/> Quay lại danh sách sinh viên</Link>
      <div className={styles.detailHeading}><span><GraduationCap size={23}/></span><div><p>EDUINSIGHT AI / STUDENT PROFILE</p><h1>Hồ sơ sinh viên</h1><small>Dữ liệu giả lập từ Data Warehouse · Chỉ dùng trong môi trường phát triển</small></div></div>
      {loading && <section className={styles.panel}><div className={styles.empty}>Đang tải hồ sơ...</div></section>}
      {error && <section className={styles.panel}><div role="alert" className={styles.error}>{error}</div></section>}
      {record && !loading && <>
        <section className={styles.profileCard}><div className={styles.profileAvatar}><Users size={28}/></div><div className={styles.profileName}><h2>{record.student.full_name}</h2><p>{record.student.student_code} · {departmentLabels[record.student.department_name] ?? record.student.department_name}</p><span className={styles.statusActive}>{statusLabels[record.student.study_status] ?? record.student.study_status}</span></div><div className={styles.profileAside}><span>Ngành đào tạo</span><strong>{record.student.program_name}</strong><span>Khóa tuyển sinh</span><strong>{record.student.admission_year}</strong></div></section>
        <section className={styles.stats}>
          <div><span>Lượt đăng ký lớp</span><strong>{record.overview.enrollments}</strong><small>Không phải số học phần duy nhất</small></div>
          <div><span>Điểm TB quy đổi / 10</span><strong>{metric(record.overview.average_grade)}</strong><small>Trung bình các bản ghi điểm</small></div>
          <div><span>Tỷ lệ hiện diện</span><strong>{metric(record.overview.attendance_rate, "%")}</strong><small>Chỉ trạng thái present</small></div>
          <div><span>Tỷ lệ nộp bài</span><strong>{metric(record.overview.assignment_submission_rate, "%")}</strong><small>Gồm bài nộp trễ</small></div>
        </section>
        <section className={styles.panel}><div className={styles.panelHeading}><div><h2><BookOpen size={19}/> Lớp học phần đã đăng ký</h2><p>Điểm trung bình theo lớp, không phải điểm kết thúc học phần.</p></div></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Mã học phần</th><th>Tên học phần</th><th>Mã lớp</th><th>Học kỳ</th><th>Trạng thái</th><th>Điểm TB / 10</th></tr></thead><tbody>{record.courses.map((course) => <tr key={course.class_key}><td className={styles.code}>{course.course_code}</td><td>{course.course_name}</td><td>{course.class_code}</td><td>{course.semester_code}</td><td>{course.enrollment_status}</td><td><strong>{metric(course.average_grade)}</strong></td></tr>)}{record.courses.length === 0 && <tr><td className={styles.empty} colSpan={6}>Chưa có dữ liệu đăng ký.</td></tr>}</tbody></table></div>{record.courses_truncated && <div className={styles.footer}>Chỉ hiển thị tối đa 100 lớp. Cần bổ sung phân trang nếu dữ liệu lớn.</div>}</section>
      </>}
      <p className={styles.disclaimer}><ShieldAlert size={16}/> Trang hồ sơ demo chưa có đăng nhập hoặc phân quyền. Không triển khai công khai với dữ liệu cá nhân thật.</p>
    </div>
  </main></AppShell>;
}
