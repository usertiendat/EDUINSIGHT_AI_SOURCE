"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, GraduationCap, Layers3, RefreshCw, Users, CalendarCheck2, ClipboardCheck, ShieldAlert } from "lucide-react";
import AppShell from "@/components/layout/app-shell";
import { type Course, departmentLabel, fetchCourses, metricText, numberText } from "@/lib/course-data";
import "../courses.css";

function Progress({ label, value, color }: {label:string;value:number|null;color:"green"|"blue"}) {
  return <div className="course-progress"><div><span>{label}</span><strong>{metricText(value, "%")}</strong></div><div className="course-progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined}><span className={color} style={{width:`${Math.max(0, Math.min(100, value ?? 0))}%`}}/></div></div>;
}

export default function CourseDetailPage() {
  const params = useParams<{courseCode:string}>();
  const courseCode = params.courseCode;
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    fetchCourses(controller.signal)
      .then(setCourses)
      .catch((e:unknown) => {if(!controller.signal.aborted) setError(e instanceof Error ? e.message : "Không thể tải học phần");})
      .finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [refresh]);
  const course = useMemo(() => courses.find(c => c.course_code === courseCode), [courses, courseCode]);
  const related = useMemo(() => courses.filter(c => c.department_code === course?.department_code && c.course_code !== courseCode).slice(0, 5), [courses, course, courseCode]);

  return <AppShell><main className="dashboard-content course-content course-detail">
    <Link href="/courses" className="course-back"><ArrowLeft size={17}/> Quay lại danh sách học phần</Link>
    {loading && <section className="panel course-loading">Đang tải thông tin học phần...</section>}
    {error && <div className="error-alert" role="alert"><span>{error}</span><button type="button" onClick={() => setRefresh(v => v+1)}>Thử lại</button></div>}
    {!loading && !error && !course && <section className="panel course-loading"><h1>Không tìm thấy học phần</h1><p>Mã học phần không tồn tại trong dữ liệu hiện tại.</p><Link className="primary-button" href="/courses">Về danh sách</Link></section>}
    {!loading && !error && course && <>
      <section className="course-detail-hero"><div className="course-detail-badge"><BookOpen size={25}/></div><div className="course-detail-name"><p className="eyebrow">EDUINSIGHT AI / COURSE PROFILE</p><h1>{course.course_name}</h1><p>{course.course_code} <span>·</span> {departmentLabel(course.department_name)} <span>·</span> {metricText(course.credits)} tín chỉ</p><small>Dữ liệu học phần giả lập từ Data Warehouse</small></div><button type="button" className="outline-button course-detail-refresh" onClick={() => setRefresh(v => v+1)}><RefreshCw size={16}/> Làm mới</button></section>
      <section className="course-stats"><div className="course-stat"><span className="course-stat-icon blue"><Layers3 size={20}/></span><small>Số lớp học phần</small><strong>{numberText(course.total_classes)}</strong><em>Trên mọi học kỳ</em></div><div className="course-stat"><span className="course-stat-icon violet"><Users size={20}/></span><small>Sinh viên duy nhất</small><strong>{numberText(course.total_students)}</strong><em>Trong học phần này</em></div><div className="course-stat"><span className="course-stat-icon green"><GraduationCap size={20}/></span><small>Điểm trung bình / 10</small><strong>{metricText(course.average_grade)}</strong><em>Trung bình các bản ghi điểm</em></div><div className="course-stat"><span className="course-stat-icon amber"><BookOpen size={20}/></span><small>Lượt đăng ký</small><strong>{numberText(course.total_enrollments)}</strong><em>Có thể lớn hơn số SV</em></div></section>
      <div className="course-detail-columns"><section className="panel course-detail-metrics"><div className="course-section-head"><div><h2>Chỉ số học tập</h2><p>Tổng hợp bản ghi theo học phần, không phải đánh giá cá nhân.</p></div></div><div className="course-detail-metrics-body"><Progress label="Tỷ lệ hiện diện" value={course.attendance_rate} color="blue"/><Progress label="Tỷ lệ nộp bài" value={course.assignment_submission_rate} color="green"/><div className="course-records"><div><CalendarCheck2 size={18}/><span>Bản ghi chuyên cần</span><strong>{numberText(course.total_attendance_records)}</strong></div><div><ClipboardCheck size={18}/><span>Bản ghi bài tập</span><strong>{numberText(course.total_assignments)}</strong></div><div><GraduationCap size={18}/><span>Bản ghi điểm</span><strong>{numberText(course.total_grade_records)}</strong></div></div></div></section>
      <section className="panel course-detail-related"><div className="course-section-head"><div><h2>Học phần cùng khoa</h2><p>Khám phá các học phần có liên quan theo khoa.</p></div></div><div className="course-related-list">{related.length ? related.map(c => <Link key={c.course_key} href={`/courses/${encodeURIComponent(c.course_code)}`}><span><strong>{c.course_name}</strong><small>{c.course_code} · {metricText(c.credits)} tín chỉ</small></span><ArrowRight size={16}/></Link>) : <p>Chưa có học phần liên quan.</p>}</div></section></div>
      <p className="course-footnote"><ShieldAlert size={15}/> Chức năng này sử dụng dữ liệu giả lập; chưa có phân quyền người dùng. Không dùng với dữ liệu sinh viên thật hoặc triển khai công khai.</p>
    </>}
  </main></AppShell>;
}
