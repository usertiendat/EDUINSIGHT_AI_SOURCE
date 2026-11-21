"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {BookOpen,CalendarCheck2,ChevronRight,GraduationCap,LayoutDashboard,LogOut,Menu,RefreshCcw,ShieldCheck,UsersRound,X} from "lucide-react";
import "./lecturer-portal.css";

type ClassInfo={class_key:number;class_code:string;class_name:string;course_code:string;course_name:string;credits:number;semester_code:string;academic_year:string;warehouse_students:number;demo_students:number;average_assessment:number|null;attendance_rate:number|null};
type Overview={lecturer:{display_name:string;username:string;role:string};classes:ClassInfo[];overview:{total_classes:number;total_students:number};dataset:string};
type Student={student_code:string;full_name:string;average_assessment:number|null;attendance_rate:number|null;is_demo:boolean};
type ClassRoster={class:{class_key:number;class_code:string;course_code:string;course_name:string;semester_code:string};students:Student[];total_students:number};
const num=(n:number|null)=>n===null?"Chưa có":n.toLocaleString("vi-VN",{maximumFractionDigits:2});
const percent=(n:number|null)=>n===null?"Chưa có":`${num(n)}%`;
export default function LecturerPortal({selectedClassKey}:{selectedClassKey?:string}){
 const router=useRouter();
 const [data,setData]=useState<Overview|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [roster,setRoster]=useState<ClassRoster|null>(null),[rosterLoading,setRosterLoading]=useState(false),[rosterError,setRosterError]=useState("");
 const [menu,setMenu]=useState(false),[search,setSearch]=useState(""),[semester,setSemester]=useState("all"),[busyLogout,setBusyLogout]=useState(false);
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{const res=await fetch("/api/lecturer-session/me",{cache:"no-store"});
   if(res.status===401){router.replace("/login");return;}
   const payload=await res.json();if(!res.ok)throw Error(payload.error||"Không thể tải dữ liệu giảng viên.");
   if(payload?.data?.dataset!=="synthetic-cntt-lecturer-v1")throw Error("Phiên bản dữ liệu giảng viên không phù hợp.");
   setData(payload.data);
  }catch(e){setError(e instanceof Error?e.message:"Lỗi kết nối.");}finally{setLoading(false);}
 },[router]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{
  if(!selectedClassKey){setRoster(null);return;}
  let active=true;
  async function loadRoster(){setRosterLoading(true);setRosterError("");setRoster(null);
   try{const res=await fetch(`/api/lecturer-session/classes/${encodeURIComponent(selectedClassKey!)}`,{cache:"no-store"});
    if(res.status===401){router.replace("/login");return;}
    const payload=await res.json();if(!res.ok)throw Error(payload.error||"Không thể tải danh sách sinh viên.");
    if(active)setRoster(payload.data);
   }catch(e){if(active)setRosterError(e instanceof Error?e.message:"Không thể tải dữ liệu lớp.");}
   finally{if(active)setRosterLoading(false);}
  }
  void loadRoster();return()=>{active=false;};
 },[selectedClassKey,router]);
 const classes=data?.classes??[];
 const semesters=useMemo(()=>Array.from(new Set(classes.map(c=>c.semester_code))).sort((a,b)=>a.localeCompare(b,"vi",{numeric:true})),[classes]);
 const filtered=classes.filter(c=>(semester==="all"||c.semester_code===semester)&&`${c.course_code} ${c.course_name} ${c.class_code}`.toLowerCase().includes(search.trim().toLowerCase()));
 async function logout(){if(busyLogout)return;setBusyLogout(true);setError("");
  try{const res=await fetch("/api/lecturer-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"}),cache:"no-store"});
   if(!res.ok){const p=await res.json().catch(()=>({}));throw Error(p.error||"Chưa thể đăng xuất.");}
   setData(null);router.replace("/login");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Lỗi đăng xuất.");}
  finally{setBusyLogout(false);}
 }
 return <div className="lp-root">
  <aside className={`lp-sidebar ${menu?"lp-sidebar-open":""}`} aria-label="Điều hướng giảng viên">
   <div className="lp-brand"><span className="lp-brand-mark"><GraduationCap size={23}/></span><div><strong>EduInsight <em>AI</em></strong><small>Cổng thông tin giảng viên</small></div><button className="lp-mobile-close" onClick={()=>setMenu(false)} aria-label="Đóng menu"><X size={20}/></button></div>
   <div className="lp-workspace"><BookOpen size={19}/><div><strong>Không gian giảng dạy</strong><small>Dữ liệu CNTT mô phỏng</small></div></div>
   <p className="lp-caption">CHỨC NĂNG GIẢNG VIÊN</p>
   <nav><Link aria-current={!selectedClassKey?"page":undefined} className={`lp-nav ${!selectedClassKey?"lp-nav-active":""}`} href="/lecturer/dashboard"><LayoutDashboard size={19}/> Tổng quan giảng dạy</Link><Link aria-current={selectedClassKey?"page":undefined} className={`lp-nav ${selectedClassKey?"lp-nav-active":""}`} href="/lecturer/dashboard#classes"><BookOpen size={19}/> Lớp học phần</Link></nav>
   <div className="lp-aside-note"><ShieldCheck size={18}/><span>Chỉ xem các lớp CNTT được phân công. Không cho phép sửa điểm hoặc hồ sơ.</span></div>
  </aside>
  {menu&&<button className="lp-overlay" aria-label="Đóng menu" onClick={()=>setMenu(false)}/>}
  <div className="lp-main"><header className="lp-topbar"><div className="lp-top-left"><button className="lp-menu" onClick={()=>setMenu(true)} aria-label="Mở menu"><Menu size={22}/></button><span>Cổng giảng viên <ChevronRight size={15}/> <strong>{selectedClassKey?"Chi tiết lớp học phần":"Tổng quan giảng dạy"}</strong></span></div><div className="lp-top-right"><span className="lp-demo-pill">DỮ LIỆU MÔ PHỎNG</span><span className="lp-account">{data?.lecturer.display_name||"Giảng viên"}</span><button disabled={busyLogout} className="lp-logout" onClick={()=>void logout()}><LogOut size={17}/> Đăng xuất</button></div></header>
   <main className="lp-content"><div className="lp-page-head"><div><p className="lp-eyebrow">EDUINSIGHT AI / GIẢNG VIÊN</p><h1>{selectedClassKey?"Danh sách sinh viên lớp học phần":"Tổng quan giảng dạy"}</h1><p>{data?.lecturer.display_name||"Tài khoản giảng viên demo"} · Chỉ dữ liệu CNTT được phân công</p></div><button className="lp-refresh" onClick={()=>void load()} disabled={loading}><RefreshCcw size={17}/> Làm mới</button></div>
   <div className="lp-notice"><ShieldCheck size={19}/>Thông tin dưới đây là dữ liệu mô phỏng, không phải điểm hoặc hồ sơ đào tạo chính thức của Học viện Hàng không Việt Nam.</div>
   {error&&<div className="lp-state lp-error" role="alert">{error}<button onClick={()=>void load()}>Thử lại</button></div>}
   {loading?<div className="lp-state" role="status">Đang tải dữ liệu giảng viên...</div>:data&&<>
   {!selectedClassKey&&<><div className="lp-cards"><div><span>Lớp CNTT phụ trách</span><strong>{data.overview.total_classes}</strong><small>Phân công theo instructor_key</small></div><div><span>Lượt sinh viên theo lớp</span><strong>{data.overview.total_students}</strong><small>Có thể trùng sinh viên giữa các lớp</small></div><div><span>Học phần phụ trách</span><strong>{new Set(classes.map(c=>c.course_code)).size}</strong><small>Chỉ các học phần CNTT</small></div></div>
    <section id="classes" className="lp-panel"><div className="lp-panel-head"><div><h2>Danh sách lớp được phân công</h2><p>Chọn một lớp để xem sinh viên và thống kê của đúng lớp đó.</p></div></div>
    <div className="lp-filters"><label><span>Tìm học phần hoặc mã lớp</span><input value={search} placeholder="Nhập mã hoặc tên học phần..." onChange={e=>setSearch(e.target.value)}/></label><label><span>Học kỳ</span><select value={semester} onChange={e=>setSemester(e.target.value)}><option value="all">Tất cả học kỳ</option>{semesters.map(s=><option key={s} value={s}>{s}</option>)}</select></label></div>
    <div className="lp-table-scroll"><table className="lp-table"><thead><tr><th>Học kỳ</th><th>Học phần</th><th>Mã lớp</th><th>SV kho dữ liệu</th><th>SV demo</th><th>TB đánh giá</th><th>Chuyên cần</th><th>Chi tiết</th></tr></thead><tbody>{filtered.map(c=><tr key={c.class_key}><td>{c.semester_code}</td><td><strong>{c.course_name}</strong><small>{c.course_code}</small></td><td>{c.class_code}</td><td>{c.warehouse_students}</td><td>{c.demo_students}</td><td>{num(c.average_assessment)}</td><td>{percent(c.attendance_rate)}</td><td><Link className="lp-link" href={`/lecturer/classes/${c.class_key}`}>Xem lớp <ChevronRight size={15}/></Link></td></tr>)}</tbody></table>{!filtered.length&&<p className="lp-empty">Không có lớp phù hợp với bộ lọc.</p>}</div></section></>}
   {selectedClassKey&&<section className="lp-panel"><div className="lp-panel-head"><div><h2>{roster?.class.course_name||"Thông tin lớp học phần"}</h2><p>{roster?.class.course_code} · {roster?.class.class_code} · {roster?.class.semester_code}</p></div><Link className="lp-link" href="/lecturer/dashboard">Về tổng quan</Link></div>
    {rosterLoading?<div className="lp-state">Đang tải danh sách lớp...</div>:rosterError?<div className="lp-state lp-error" role="alert">{rosterError}</div>:roster?<><div className="lp-roster-note"><UsersRound size={18}/> Có {roster.total_students} sinh viên trong danh sách lớp, bao gồm hồ sơ mô phỏng nếu được đăng ký vào lớp này.</div><div className="lp-table-scroll"><table className="lp-table"><thead><tr><th>Mã sinh viên</th><th>Họ tên</th><th>Trung bình đánh giá</th><th>Chuyên cần</th><th>Loại hồ sơ</th></tr></thead><tbody>{roster.students.map(s=><tr key={s.student_code}><td>{s.student_code}</td><td><strong>{s.full_name}</strong></td><td>{num(s.average_assessment)}</td><td>{percent(s.attendance_rate)}</td><td>{s.is_demo?<span className="lp-demo-label">Mô phỏng cá nhân</span>:"Kho dữ liệu mô phỏng"}</td></tr>)}</tbody></table>{!roster.students.length&&<p className="lp-empty">Chưa có sinh viên trong lớp.</p>}</div></>:null}</section>}
   </>}
   </main>
  </div></div>;
}
