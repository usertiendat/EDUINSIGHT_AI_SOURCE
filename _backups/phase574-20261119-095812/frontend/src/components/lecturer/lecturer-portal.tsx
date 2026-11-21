"use client";

import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Activity,AlertTriangle,BarChart3,BookOpen,CalendarCheck2,ChevronRight,GraduationCap,LayoutDashboard,LogOut,Menu,RefreshCcw,Search,ShieldCheck,UsersRound,X} from "lucide-react";
import "./lecturer-portal.css";
import ClassAnalytics, {type ClassRoster} from "./class-analytics";

type ClassInfo={class_key:number;class_code:string;class_name:string;course_code:string;course_name:string;credits:number;semester_code:string;academic_year:string;warehouse_students:number;demo_students:number;average_assessment:number|null;attendance_rate:number|null};
type Overview={lecturer:{display_name:string;username:string;role:string};classes:ClassInfo[];overview:{total_classes:number;total_students:number};dataset:string};
type Metric="attendance"|"grade";
const ATTENDANCE_REVIEW_THRESHOLD=80; // Ngưỡng minh họa của dashboard demo, không phải chính sách VAA.
const GRADE_REVIEW_THRESHOLD=5; // Thang 10, chỉ để gợi ý xem xét dữ liệu.
const fmt=(n:number|null|undefined,digits=2)=>typeof n!=="number"||!Number.isFinite(n)?"Chưa có":n.toLocaleString("vi-VN",{maximumFractionDigits:digits});
const pct=(n:number|null|undefined)=>typeof n!=="number"||!Number.isFinite(n)?"Chưa có":`${fmt(n)}%`;
const clean=(s:string)=>s.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d");
const validNum=(v:number|null):v is number=>typeof v==="number"&&Number.isFinite(v);

export default function LecturerPortal({selectedClassKey}:{selectedClassKey?:string}){
 const router=useRouter();
 const [data,setData]=useState<Overview|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [roster,setRoster]=useState<ClassRoster|null>(null),[rosterLoading,setRosterLoading]=useState(false),[rosterError,setRosterError]=useState("");
 const [menu,setMenu]=useState(false),[search,setSearch]=useState(""),[semester,setSemester]=useState("all"),[metric,setMetric]=useState<Metric>("attendance"),[sort,setSort]=useState("semester"),[busyLogout,setBusyLogout]=useState(false);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const res=await fetch("/api/lecturer-session/me",{cache:"no-store"});
   if(res.status===401){router.replace("/login");return;}
   const payload=await res.json();if(!res.ok)throw Error(payload.error||"Không thể tải dữ liệu giảng viên.");
   if(payload?.data?.dataset!=="synthetic-cntt-lecturer-v1"||!Array.isArray(payload?.data?.classes))throw Error("Dữ liệu giảng viên không đúng định dạng.");
   setData(payload.data);
  }catch(e){setError(e instanceof Error?e.message:"Lỗi kết nối.");}finally{setLoading(false);}
 },[router]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{
  if(!selectedClassKey){setRoster(null);return;}
  let active=true;
  async function loadRoster(){setRosterLoading(true);setRosterError("");setRoster(null);
   try{
    const res=await fetch(`/api/lecturer-session/classes/${encodeURIComponent(selectedClassKey!)}`,{cache:"no-store"});
    if(res.status===401){router.replace("/login");return;}
    const payload=await res.json();if(!res.ok)throw Error(payload.error||"Không thể tải danh sách sinh viên.");
    if(active)setRoster(payload.data);
   }catch(e){if(active)setRosterError(e instanceof Error?e.message:"Không thể tải dữ liệu lớp.");}
   finally{if(active)setRosterLoading(false);}
  }
  void loadRoster();return()=>{active=false;};
 },[selectedClassKey,router]);
 const classes=useMemo(()=>data?.classes??[],[data]);
 const semesters=useMemo(()=>Array.from(new Set(classes.map(c=>c.semester_code))).sort((a,b)=>a.localeCompare(b,"vi",{numeric:true})),[classes]);
 const filtered=useMemo(()=>classes.filter(c=>(semester==="all"||c.semester_code===semester)&&clean(`${c.course_code} ${c.course_name} ${c.class_code}`).includes(clean(search.trim()))).sort((a,b)=>{
  if(sort==="attendance")return (b.attendance_rate??-1)-(a.attendance_rate??-1);
  if(sort==="grade")return (b.average_assessment??-1)-(a.average_assessment??-1);
  if(sort==="name")return a.course_name.localeCompare(b.course_name,"vi");
  return a.semester_code.localeCompare(b.semester_code,"vi",{numeric:true})||a.course_code.localeCompare(b.course_code,"vi",{numeric:true});
 }),[classes,semester,search,sort]);
 const stats=useMemo(()=>{
  const validGrade=filtered.filter(c=>validNum(c.average_assessment));
  const validAttendance=filtered.filter(c=>validNum(c.attendance_rate));
  const avgGrade=validGrade.length?validGrade.reduce((s,c)=>s+c.average_assessment!,0)/validGrade.length:null;
  const avgAttendance=validAttendance.length?validAttendance.reduce((s,c)=>s+c.attendance_rate!,0)/validAttendance.length:null;
  return {classCount:filtered.length, warehouseSeats:filtered.reduce((s,c)=>s+Math.max(0,c.warehouse_students),0),demoSeats:filtered.reduce((s,c)=>s+Math.max(0,c.demo_students),0),courses:new Set(filtered.map(c=>c.course_code)).size,avgGrade,avgAttendance,validGrade:validGrade.length,validAttendance:validAttendance.length};
 },[filtered]);
 const review=useMemo(()=>filtered.filter(c=>(validNum(c.attendance_rate)&&c.attendance_rate<ATTENDANCE_REVIEW_THRESHOLD)||(validNum(c.average_assessment)&&c.average_assessment<GRADE_REVIEW_THRESHOLD)).sort((a,b)=>(a.attendance_rate??101)-(b.attendance_rate??101)),[filtered]);
 const graph=useMemo(()=>[...filtered].filter(c=>validNum(metric==="grade"?c.average_assessment:c.attendance_rate)).sort((a,b)=>metric==="grade"?(a.average_assessment!-b.average_assessment!):(a.attendance_rate!-b.attendance_rate!)).slice(0,8),[filtered,metric]);
 async function logout(){if(busyLogout)return;setBusyLogout(true);setError("");
  try{const res=await fetch("/api/lecturer-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"}),cache:"no-store"});
   if(!res.ok){const p=await res.json().catch(()=>({}));throw Error(p.error||"Chưa thể đăng xuất.");}
   setData(null);router.replace("/login");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Lỗi đăng xuất.");}finally{setBusyLogout(false);}
 }
 return <div className="lp-root">
  <aside className={`lp-sidebar ${menu?"lp-sidebar-open":""}`} aria-label="Điều hướng giảng viên">
   <div className="lp-brand"><span className="lp-brand-mark"><GraduationCap size={23}/></span><div><strong>EduInsight <em>AI</em></strong><small>Cổng thông tin giảng viên</small></div><button type="button" className="lp-mobile-close" onClick={()=>setMenu(false)} aria-label="Đóng menu"><X size={20}/></button></div>
   <div className="lp-workspace"><BookOpen size={19}/><div><strong>Không gian giảng dạy</strong><small>Dữ liệu CNTT mô phỏng</small></div></div>
   <p className="lp-caption">CHỨC NĂNG GIẢNG VIÊN</p>
   <nav><Link onClick={()=>setMenu(false)} aria-current={!selectedClassKey?"page":undefined} className={`lp-nav ${!selectedClassKey?"lp-nav-active":""}`} href="/lecturer/dashboard"><LayoutDashboard size={19}/> Tổng quan giảng dạy</Link><Link onClick={()=>setMenu(false)} className="lp-nav" href="/lecturer/dashboard#classes"><BookOpen size={19}/> Lớp học phần</Link></nav>
   <div className="lp-aside-note"><ShieldCheck size={18}/><span>Chỉ xem các lớp CNTT được phân công. Không cho phép sửa điểm hoặc hồ sơ.</span></div>
  </aside>
  {menu&&<button type="button" className="lp-overlay" aria-label="Đóng menu" onClick={()=>setMenu(false)}/>}
  <div className="lp-main"><header className="lp-topbar"><div className="lp-top-left"><button type="button" className="lp-menu" onClick={()=>setMenu(true)} aria-label="Mở menu"><Menu size={22}/></button><span>Cổng giảng viên <ChevronRight size={15}/> <strong>{selectedClassKey?"Chi tiết lớp học phần":"Tổng quan giảng dạy"}</strong></span></div><div className="lp-top-right"><span className="lp-demo-pill">DỮ LIỆU MÔ PHỎNG</span><span className="lp-account">{data?.lecturer.display_name||"Giảng viên"}</span><button type="button" disabled={busyLogout} className="lp-logout" onClick={()=>void logout()}><LogOut size={17}/> Đăng xuất</button></div></header>
   <main className="lp-content"><div className="lp-page-head"><div><p className="lp-eyebrow">EDUINSIGHT AI / GIẢNG VIÊN</p><h1>{selectedClassKey?"Danh sách sinh viên lớp học phần":"Tổng quan giảng dạy"}</h1><p>{data?.lecturer.display_name||"Tài khoản giảng viên demo"} · Chỉ dữ liệu CNTT được phân công</p></div><button type="button" className="lp-refresh" onClick={()=>void load()} disabled={loading}><RefreshCcw size={17}/> Làm mới</button></div>
   <div className="lp-notice"><ShieldCheck size={19}/>Thông tin dưới đây là dữ liệu mô phỏng, không phải điểm hoặc hồ sơ đào tạo chính thức của Học viện Hàng không Việt Nam.</div>
   {error&&<div className="lp-state lp-error" role="alert">{error}<button type="button" onClick={()=>void load()}>Thử lại</button></div>}
   {loading?<div className="lp-state" role="status">Đang tải dữ liệu giảng viên...</div>:data&&<>
   {!selectedClassKey&&<>
    <section className="lp-toolbar" aria-label="Bộ lọc tổng quan"><div className="lp-toolbar-intro"><h2>Phạm vi phân tích</h2><p>Các chỉ số và biểu đồ cập nhật cùng bộ lọc bên dưới.</p></div><label className="lp-filter-input"><Search size={17}/><input aria-label="Tìm lớp hoặc học phần" value={search} placeholder="Tìm lớp, mã hoặc học phần..." onChange={e=>setSearch(e.target.value)}/></label><label className="lp-filter-select"><span>Học kỳ</span><select aria-label="Lọc học kỳ" value={semester} onChange={e=>setSemester(e.target.value)}><option value="all">Tất cả học kỳ</option>{semesters.map(s=><option key={s} value={s}>{s}</option>)}</select></label></section>
    <div className="lp-cards lp-cards-upgraded">
     <div><span><BookOpen size={17}/> Lớp được phân công</span><strong>{fmt(stats.classCount,0)}</strong><small>{stats.courses} học phần CNTT trong phạm vi lọc</small></div>
     <div><span><UsersRound size={17}/> Lượt sinh viên theo lớp</span><strong>{fmt(stats.warehouseSeats+stats.demoSeats,0)}</strong><small>{fmt(stats.warehouseSeats,0)} kho dữ liệu + {fmt(stats.demoSeats,0)} demo; có thể trùng sinh viên</small></div>
     <div><span><BarChart3 size={17}/> Trung bình điểm đánh giá</span><strong>{fmt(stats.avgGrade)} / 10</strong><small>Trung bình không trọng số của {stats.validGrade} lớp có dữ liệu</small></div>
     <div><span><CalendarCheck2 size={17}/> Tỷ lệ có mặt bình quân</span><strong>{pct(stats.avgAttendance)}</strong><small>Trung bình không trọng số của {stats.validAttendance} lớp có dữ liệu</small></div>
    </div>
    <div className="lp-insight-grid">
     <section className="lp-panel lp-analysis"><div className="lp-panel-head"><div><h2><Activity size={19}/> So sánh kết quả theo lớp</h2><p>Tối đa 8 lớp có chỉ số thấp nhất trong phạm vi đang chọn.</p></div><div className="lp-switch" aria-label="Chọn chỉ số so sánh"><button type="button" aria-pressed={metric==="attendance"} className={metric==="attendance"?"is-active":""} onClick={()=>setMetric("attendance")}>Chuyên cần</button><button type="button" aria-pressed={metric==="grade"} className={metric==="grade"?"is-active":""} onClick={()=>setMetric("grade")}>Điểm</button></div></div>
      <div className="lp-chart" role="list" aria-label={`So sánh ${metric==="grade"?"điểm đánh giá":"tỷ lệ có mặt"} theo lớp`}>{graph.length?graph.map(c=>{const v=metric==="grade"?c.average_assessment!:c.attendance_rate!;const width=Math.min(100,Math.max(0,metric==="grade"?v*10:v));return <div className="lp-bar-row" role="listitem" key={c.class_key}><div className="lp-bar-meta"><Link href={`/lecturer/classes/${c.class_key}`} title={c.course_name}>{c.class_code}</Link><span>{metric==="grade"?`${fmt(v)} / 10`:pct(v)}</span></div><div className="lp-bar-track"><div className="lp-bar-fill" style={{width:`${width}%`}}/></div><p title={c.course_name}>{c.course_name}</p></div>}):<p className="lp-empty">Chưa có số liệu để vẽ biểu đồ cho bộ lọc này.</p>}</div>
      <p className="lp-analytics-footnote">Biểu đồ dùng số liệu trung bình theo lớp từ API. Điểm là trung bình điểm đánh giá, không phải điểm tổng kết hoặc GPA. Tỷ lệ có mặt chỉ tính trạng thái “present”.</p>
     </section>
     <section className="lp-panel lp-review"><div className="lp-panel-head"><div><h2><AlertTriangle size={19}/> Lớp nên xem xét</h2><p>Gợi ý theo ngưỡng minh họa, không phải đánh giá chính thức.</p></div><span className="lp-count">{review.length} lớp</span></div><div className="lp-review-list">{review.length?review.slice(0,6).map(c=><Link className="lp-review-item" key={c.class_key} href={`/lecturer/classes/${c.class_key}`}><span><strong>{c.class_code}</strong><small>{c.course_name}</small></span><span className="lp-review-metric">{validNum(c.attendance_rate)&&c.attendance_rate<ATTENDANCE_REVIEW_THRESHOLD?`Có mặt ${pct(c.attendance_rate)}`:`Điểm ${fmt(c.average_assessment)}`}</span><ChevronRight size={16}/></Link>):<p className="lp-empty">Không có lớp dưới ngưỡng demo trong phạm vi hiện tại.</p>}</div><p className="lp-analytics-footnote">Ngưỡng demo: tỷ lệ có mặt dưới {ATTENDANCE_REVIEW_THRESHOLD}% hoặc trung bình điểm đánh giá dưới {GRADE_REVIEW_THRESHOLD}/10. Không suy ra nguy cơ học vụ hay nguyên nhân.</p></section>
    </div>
    <section id="classes" className="lp-panel"><div className="lp-panel-head"><div><h2>Danh sách lớp được phân công</h2><p>{filtered.length} / {classes.length} lớp phù hợp. Bấm “Xem lớp” để mở danh sách sinh viên trong phạm vi lớp.</p></div><label className="lp-sort">Sắp xếp <select aria-label="Sắp xếp lớp" value={sort} onChange={e=>setSort(e.target.value)}><option value="semester">Theo học kỳ</option><option value="attendance">Chuyên cần cao trước</option><option value="grade">Điểm cao trước</option><option value="name">Tên học phần</option></select></label></div>
    <div className="lp-table-scroll"><table className="lp-table"><thead><tr><th>Học kỳ</th><th>Học phần</th><th>Mã lớp</th><th>SV kho dữ liệu</th><th>SV demo</th><th>TB đánh giá</th><th>Có mặt</th><th>Chi tiết</th></tr></thead><tbody>{filtered.map(c=><tr key={c.class_key}><td>{c.semester_code}</td><td><strong>{c.course_name}</strong><small>{c.course_code}</small></td><td>{c.class_code}</td><td>{fmt(c.warehouse_students,0)}</td><td>{fmt(c.demo_students,0)}</td><td>{fmt(c.average_assessment)}</td><td>{pct(c.attendance_rate)}</td><td><Link className="lp-link" href={`/lecturer/classes/${c.class_key}`}>Xem lớp <ChevronRight size={15}/></Link></td></tr>)}</tbody></table>{!filtered.length&&<p className="lp-empty">Không có lớp phù hợp. Thử thay đổi học kỳ hoặc từ khóa.</p>}</div></section>
   </>}
   {selectedClassKey&&<div className="lp2-detail-page"><section className="lp2-class-header"><div><span className="lp2-header-eyebrow">LỚP HỌC PHẦN · PHÂN TÍCH CHI TIẾT</span><h2>{roster?.class.course_name||"Thông tin lớp học phần"}</h2><p>{roster?.class.course_code||"—"} <span aria-hidden="true">·</span> {roster?.class.class_code||"—"} <span aria-hidden="true">·</span> Học kỳ {roster?.class.semester_code||"—"}</p></div><Link className="lp2-back" href="/lecturer/dashboard#classes">Về danh sách lớp <ChevronRight size={16}/></Link></section>
    {rosterLoading?<div className="lp-state" role="status">Đang tải phân tích lớp...</div>:rosterError?<div className="lp-state lp-error" role="alert">{rosterError}</div>:roster?<ClassAnalytics roster={roster}/>:null}</div>}
   </>}
   </main>
  </div></div>;
}
