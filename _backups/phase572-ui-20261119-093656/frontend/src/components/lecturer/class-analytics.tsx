"use client";

import {useMemo, useState} from "react";
import {Activity, BookOpenCheck, CalendarCheck2, ChevronDown, ChevronUp, ClipboardCheck, Search, UsersRound} from "lucide-react";

export type StudentDetail = {
  student_code:string;
  full_name:string;
  is_demo:boolean;
  quiz_score:number|null;
  exam_score:number|null;
  average_assessment:number|null;
  attendance_present:number;
  attendance_late:number;
  attendance_absent:number;
  attendance_total:number;
  attendance_rate:number|null;
  assignment_total:number;
  assignment_submitted:number;
  assignment_late:number;
  assignment_missing:number;
};
export type ClassRoster = {
  class:{class_key:number;class_code:string;course_code:string;course_name:string;semester_code:string};
  students:StudentDetail[];
  total_students:number;
  analytics:{students:number;with_grades:number;grades_mean:number|null;attendance_present:number;attendance_late:number;attendance_absent:number;attendance_total:number;attendance_rate:number|null;assignment_total:number;assignment_submitted:number;assignment_late:number;assignment_missing:number;assignment_rate:number|null};
};
const number=(n:number|null|undefined)=>n==null||!Number.isFinite(n)?"Chưa có":n.toLocaleString("vi-VN",{maximumFractionDigits:2});
const percentage=(n:number|null|undefined)=>n==null||!Number.isFinite(n)?"Chưa có":`${number(n)}%`;
const slug=(s:string)=>s.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
const percentOf=(a:number,b:number)=>b>0?Math.round(100*a/b):0;
const REVIEW_THRESHOLD=80; // Chi la nguong minh hoa, khong phai quy dinh cua VAA.
type Filter="all"|"attendance"|"missing"|"no-grade";
export default function ClassAnalytics({roster}:{roster:ClassRoster}) {
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState<Filter>("all");
  const [sort,setSort]=useState("code");
  const [expanded,setExpanded]=useState<string|null>(null);
  const a=roster.analytics;
  const visible=useMemo(()=>roster.students.filter(s=>{
    if(query && !slug(`${s.student_code} ${s.full_name}`).includes(slug(query.trim())))return false;
    if(filter==="attendance")return s.attendance_rate!==null&&s.attendance_rate<REVIEW_THRESHOLD;
    if(filter==="missing")return s.assignment_missing>0;
    if(filter==="no-grade")return s.average_assessment===null;
    return true;
  }).sort((left,right)=>{
    if(sort==="attendance")return (left.attendance_rate??101)-(right.attendance_rate??101);
    if(sort==="grade")return (left.average_assessment??-1)-(right.average_assessment??-1);
    if(sort==="missing")return right.assignment_missing-left.assignment_missing;
    return left.student_code.localeCompare(right.student_code,"vi",{numeric:true});
  }),[roster.students,query,filter,sort]);
  return <div className="lp-class-analytics">
    <div className="lp-class-metrics" aria-label="Chỉ số lớp học phần">
      <div><span><UsersRound size={17}/> Sinh viên trong lớp</span><strong>{number(a.students)}</strong><small>{roster.students.filter(s=>s.is_demo).length} hồ sơ demo cá nhân</small></div>
      <div><span><BookOpenCheck size={17}/> Điểm đánh giá TB</span><strong>{number(a.grades_mean)} / 10</strong><small>{a.with_grades} sinh viên có điểm; không phải GPA</small></div>
      <div><span><CalendarCheck2 size={17}/> Tỷ lệ có mặt</span><strong>{percentage(a.attendance_rate)}</strong><small>{a.attendance_present}/{a.attendance_total} lượt; đi muộn tính riêng</small></div>
      <div><span><ClipboardCheck size={17}/> Tỷ lệ nộp bài</span><strong>{percentage(a.assignment_rate)}</strong><small>{a.assignment_submitted}/{a.assignment_total} bài, gồm nộp trễ</small></div>
    </div>
    <div className="lp-class-grid">
      <section className="lp-subpanel" aria-label="Phân bố chuyên cần"><h3><Activity size={18}/> Phân bố chuyên cần</h3>
        <div className="lp-class-stack" role="img" aria-label={`Có mặt ${a.attendance_present}, đi muộn ${a.attendance_late}, vắng ${a.attendance_absent}`}>
          <span className="lp-class-present" style={{width:`${percentOf(a.attendance_present,a.attendance_total)}%`}}/>
          <span className="lp-class-late" style={{width:`${percentOf(a.attendance_late,a.attendance_total)}%`}}/>
          <span className="lp-class-absent" style={{width:`${percentOf(a.attendance_absent,a.attendance_total)}%`}}/>
        </div>
        <div className="lp-class-legend"><span><i className="lp-class-present"/> Có mặt: {a.attendance_present}</span><span><i className="lp-class-late"/> Đi muộn: {a.attendance_late}</span><span><i className="lp-class-absent"/> Vắng: {a.attendance_absent}</span></div>
        <p>Đơn vị là lượt điểm danh, không phải số sinh viên. Chỉ trạng thái “có mặt” tính vào tỷ lệ có mặt.</p>
      </section>
      <section className="lp-subpanel" aria-label="Tình trạng bài tập"><h3><ClipboardCheck size={18}/> Tình trạng bài tập</h3>
        <div className="lp-class-stack" role="img" aria-label={`Nộp đúng trạng thái ${a.assignment_submitted-a.assignment_late}, nộp trễ ${a.assignment_late}, chưa nộp ${a.assignment_missing}`}>
          <span className="lp-class-present" style={{width:`${percentOf(a.assignment_submitted-a.assignment_late,a.assignment_total)}%`}}/>
          <span className="lp-class-late" style={{width:`${percentOf(a.assignment_late,a.assignment_total)}%`}}/>
          <span className="lp-class-absent" style={{width:`${percentOf(a.assignment_missing,a.assignment_total)}%`}}/>
        </div>
        <div className="lp-class-legend"><span><i className="lp-class-present"/> Đã nộp: {a.assignment_submitted-a.assignment_late}</span><span><i className="lp-class-late"/> Nộp trễ: {a.assignment_late}</span><span><i className="lp-class-absent"/> Chưa nộp: {a.assignment_missing}</span></div>
        <p>“Tỷ lệ nộp bài” bao gồm cả bài nộp trễ; không suy ra kết quả đánh giá học phần.</p>
      </section>
    </div>
    <section className="lp-panel lp-class-roster" aria-label="Phân tích sinh viên theo lớp">
      <div className="lp-panel-head"><div><h2>Phân tích sinh viên trong lớp</h2><p>Chỉ xem thông tin thuộc lớp đang phụ trách. Mở một dòng để xem số liệu chi tiết.</p></div><span className="lp-count">{visible.length}/{roster.total_students} sinh viên</span></div>
      <div className="lp-class-controls">
        <label className="lp-filter-input"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm mã hoặc tên sinh viên" aria-label="Tìm sinh viên trong lớp"/></label>
        <label>Bộ lọc <select value={filter} onChange={e=>setFilter(e.target.value as Filter)}><option value="all">Tất cả</option><option value="attendance">Có mặt dưới 80% (ngưỡng demo)</option><option value="missing">Có bài chưa nộp</option><option value="no-grade">Chưa có điểm đánh giá</option></select></label>
        <label>Sắp xếp <select value={sort} onChange={e=>setSort(e.target.value)}><option value="code">Theo mã sinh viên</option><option value="attendance">Tỷ lệ có mặt thấp trước</option><option value="grade">Điểm đánh giá thấp trước</option><option value="missing">Nhiều bài thiếu trước</option></select></label>
      </div>
      <div className="lp-table-scroll"><table className="lp-table lp-class-table"><thead><tr><th>Sinh viên</th><th>Điểm kiểm tra</th><th>Điểm thi</th><th>TB đánh giá</th><th>Có mặt</th><th>Bài đã nộp</th><th>Chi tiết</th></tr></thead><tbody>
        {visible.map(s=><tr key={s.student_code}><td><strong>{s.full_name}</strong><small>{s.student_code}{s.is_demo?" · Demo cá nhân":""}</small></td><td>{number(s.quiz_score)}</td><td>{number(s.exam_score)}</td><td>{number(s.average_assessment)}</td><td>{percentage(s.attendance_rate)}</td><td>{s.assignment_submitted}/{s.assignment_total}</td><td><button type="button" className="lp-class-detail-button" aria-expanded={expanded===s.student_code} onClick={()=>setExpanded(x=>x===s.student_code?null:s.student_code)}>{expanded===s.student_code?"Thu gọn":"Xem chi tiết"}{expanded===s.student_code?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button></td></tr>).flatMap((tr,i)=>{
          const s=visible[i];
          return expanded===s.student_code?[tr,<tr key={`${s.student_code}-detail`} className="lp-class-expanded"><td colSpan={7}><div className="lp-class-detail-grid"><div><strong>Chuyên cần trong lớp</strong><span>Có mặt: {s.attendance_present}/{s.attendance_total}</span><span>Đi muộn: {s.attendance_late}</span><span>Vắng: {s.attendance_absent}</span></div><div><strong>Bài tập của lớp</strong><span>Tổng: {s.assignment_total}</span><span>Đã nộp (gồm trễ): {s.assignment_submitted}</span><span>Nộp trễ: {s.assignment_late} · Chưa nộp: {s.assignment_missing}</span></div><div><strong>Điểm đánh giá mô phỏng</strong><span>Kiểm tra: {number(s.quiz_score)}/10</span><span>Thi: {number(s.exam_score)}/10</span><span>Trung bình: {number(s.average_assessment)}/10</span></div></div></td></tr>]:[tr];
        })}
      </tbody></table>{visible.length===0&&<p className="lp-empty">Không tìm thấy sinh viên phù hợp với bộ lọc. Hãy thử lựa chọn khác.</p>}</div>
      <p className="lp-class-disclaimer">Các chỉ số được tổng hợp từ điểm kiểm tra/thi, chuyên cần và bài tập của **lớp này**. Không phải điểm tổng kết chính thức hoặc đánh giá học lực. Ngưỡng 80% là ngưỡng minh họa.</p>
    </section>
  </div>;
}
