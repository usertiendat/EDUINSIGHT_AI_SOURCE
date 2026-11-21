'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Activity,AlertCircle,ArrowRight,BookOpen,CalendarDays,CheckCircle2,FileText,GraduationCap,History,LayoutDashboard,LogOut,RefreshCw,School,ShieldCheck,Users} from 'lucide-react';
import './admin.css';
import './overview.css';

type Account={username:string;display_name:string;role:'student'|'lecturer'|'admin';is_active:boolean;created_at:string};
type Me={username:string;display_name:string;role:string;session_expires_at:string};
type Overview={total_students:number;total_instructors:number;total_courses:number;total_classes:number;total_enrollments:number;average_grade:number|null;attendance_rate:number|null;assignment_submission_rate:number|null};
type Department={department_key:number;department_code:string;department_name:string;total_students:number;total_courses:number;total_instructors:number};
type Semester={semester_key:number;semester_code:string;semester_name:string;academic_year:string;total_classes:number;total_students:number;total_enrollments:number;average_grade:number|null;attendance_rate:number|null;assignment_submission_rate:number|null};
type Analytics={overview:Overview;departments:Department[];semesters:Semester[];courses:unknown[]};
type Event={event_id:number;event_type:string;occurred_at:string;actor_username:string;result:string};
type SecurityPage={items:Event[];has_more:boolean;next_before_id:number|null};
const num=(value:number|null|undefined)=>value==null?'—':new Intl.NumberFormat('vi-VN').format(value);
const percent=(value:number|null|undefined)=>value==null?'Chưa có dữ liệu':`${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(value)}%`;
const grade=(value:number|null|undefined)=>value==null?'—':`${new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(value)} / 10`;
const roleLabels={student:'Sinh viên',lecturer:'Giảng viên',admin:'Quản trị viên'} as const;
const eventLabels:Record<string,string>={admin_login_success:'Đăng nhập thành công',admin_login_failed:'Đăng nhập thất bại',admin_logout:'Đăng xuất',account_activated:'Kích hoạt tài khoản',account_deactivated:'Vô hiệu hóa tài khoản'};

export default function AdminDashboard(){
 const router=useRouter();
 const [me,setMe]=useState<Me|null>(null),[accounts,setAccounts]=useState<Account[]>([]),[analytics,setAnalytics]=useState<Analytics|null>(null),[security,setSecurity]=useState<SecurityPage|null>(null);
 const [semesterKey,setSemesterKey]=useState('all'),[departmentKey,setDepartmentKey]=useState('all');
 const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[sectionsError,setSectionsError]=useState<string[]>([]);
 const load=useCallback(async(initial=false)=>{
  if(initial)setLoading(true);else setRefreshing(true);
  setError('');setSectionsError([]);
  try{
   const response=await fetch('/api/admin-session/me',{cache:'no-store'});
   if(response.status===401||response.status===403){router.replace('/login');return;}
   if(!response.ok)throw new Error('Không thể xác thực phiên quản trị viên.');
   const meBody=await response.json() as {data:Me};if(!meBody.data||meBody.data.role!=='admin')throw new Error('Phiên này không có quyền quản trị.');
   setMe(meBody.data);
   const results=await Promise.allSettled([
    fetch('/api/admin-session/users',{cache:'no-store'}),
    fetch('/api/dashboard',{cache:'no-store'}),
    fetch('/api/admin-session/security-events?limit=100',{cache:'no-store'}),
   ]);
   const failures:string[]=[];
   const labels=['Tài khoản','Dữ liệu đào tạo','Nhật ký bảo mật'];
   for(let i=0;i<results.length;i++){
    const result=results[i];
    if(result.status==='rejected'){failures.push(`${labels[i]}: không kết nối được.`);continue;}
    const r=result.value;
    if(r.status===401||r.status===403){router.replace('/login');return;}
    if(!r.ok){failures.push(`${labels[i]}: HTTP ${r.status}.`);continue;}
    try{
     const body=await r.json();
     if(i===0){if(!Array.isArray(body.data))throw new Error('Danh sách tài khoản không hợp lệ');setAccounts(body.data as Account[]);}
     if(i===1){if(!body.overview||!Array.isArray(body.departments)||!Array.isArray(body.semesters))throw new Error('Dữ liệu Analytics không hợp lệ');setAnalytics(body as Analytics);}
     if(i===2){if(!body.data||!Array.isArray(body.data.items))throw new Error('Nhật ký không hợp lệ');setSecurity(body.data as SecurityPage);}
    }catch{failures.push(`${labels[i]}: dữ liệu phản hồi không hợp lệ.`);}
   }
   setSectionsError(failures);
  }catch(e){setError(e instanceof Error?e.message:'Không thể tải Dashboard.');}
  finally{setLoading(false);setRefreshing(false);}
 },[router]);
 useEffect(()=>{void load(true);},[load]);
 const filteredDepartments=useMemo(()=>analytics?.departments.filter(d=>departmentKey==='all'||String(d.department_key)===departmentKey)??[],[analytics,departmentKey]);
 const semester=useMemo(()=>analytics?.semesters.find(s=>String(s.semester_key)===semesterKey),[analytics,semesterKey]);
 const roleCounts=useMemo(()=>({student:accounts.filter(a=>a.role==='student').length,lecturer:accounts.filter(a=>a.role==='lecturer').length,admin:accounts.filter(a=>a.role==='admin').length}),[accounts]);
 const counts=useMemo(()=>({active:accounts.filter(a=>a.is_active).length,inactive:accounts.filter(a=>!a.is_active).length}),[accounts]);
 // Security endpoint exposes the latest 100 records only; never label these totals as all-time.
 const events=security?.items??[];
 const eventStats=useMemo(()=>({success:events.filter(e=>e.event_type==='admin_login_success').length,failed:events.filter(e=>e.event_type==='admin_login_failed').length,logout:events.filter(e=>e.event_type==='admin_logout').length}),[events]);
 const base=analytics?.overview;
 const schoolMetrics=semester?{students:semester.total_students,classes:semester.total_classes,enrollments:semester.total_enrollments,grade:semester.average_grade,attendance:semester.attendance_rate,assignments:semester.assignment_submission_rate}:base?{students:base.total_students,classes:base.total_classes,enrollments:base.total_enrollments,grade:base.average_grade,attendance:base.attendance_rate,assignments:base.assignment_submission_rate}:null;
 async function logout(){setBusy(true);setError('');try{const r=await fetch('/api/admin-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!r.ok)throw new Error('Chưa xác nhận được đăng xuất.');router.replace('/login');router.refresh();}catch(e){setError(e instanceof Error?e.message:'Đăng xuất thất bại.');}finally{setBusy(false);}}
 return <main className="ad58 ad585"><div className="ad58-wrap">
  <header className="ad58-head"><div className="ad58-brand"><ShieldCheck size={28}/><span><strong>EduInsight AI</strong><small>Không gian quản trị · Học viện Hàng không Việt Nam</small></span></div><div className="ad585-head-actions"><button type="button" className="ad585-button" disabled={loading||refreshing} onClick={()=>void load()}><RefreshCw size={16} className={refreshing?'ad585-spin':''}/> Làm mới</button><button type="button" className="ad58-logout" onClick={logout} disabled={busy}><LogOut size={16}/> Đăng xuất</button></div></header>
  <section className="ad585-hero"><div><span className="ad585-eyebrow">TRUNG TÂM QUẢN TRỊ · PHASE 5.8.5</span><h1>Tổng quan hệ thống</h1><p>{me?`Xin chào, ${me.display_name}. Theo dõi dữ liệu đào tạo và an toàn tài khoản từ một nơi.`:'Đang xác thực quyền quản trị...'}</p></div><div className="ad585-hero-icon"><LayoutDashboard size={31}/></div></section>
  {error&&<div className="ad58-error" role="alert"><AlertCircle size={18}/> {error}</div>}
  {sectionsError.length>0&&<div className="ad585-warning" role="status"><AlertCircle size={18}/><div><strong>Một số dữ liệu chưa tải được</strong><p>{sectionsError.join(' ')} Các phần còn lại vẫn có thể sử dụng.</p></div></div>}
  {loading?<div className="ad585-loading" role="status">Đang tải dữ liệu từ các API quản trị...</div>:me&&<>
   <section className="ad585-section" aria-label="Tổng quan đào tạo"><div className="ad585-titlebar"><div><span className="ad585-overline">KHO DỮ LIỆU ĐÀO TẠO</span><h2>Chỉ số đào tạo</h2><p>Dữ liệu Warehouse mô phỏng, không cộng tài khoản demo vào số sinh viên.</p></div><label className="ad585-selectlabel"><CalendarDays size={17}/><span className="ad585-sr">Chọn học kỳ</span><select value={semesterKey} onChange={e=>setSemesterKey(e.target.value)}><option value="all">Toàn bộ học kỳ</option>{analytics?.semesters.map(s=><option key={s.semester_key} value={s.semester_key}>{s.semester_name} ({s.semester_code})</option>)}</select></label></div>
   <div className="ad585-kpis"><article className="ad585-kpi"><div className="ad585-kpi-icon"><GraduationCap/></div><span>Sinh viên Warehouse</span><strong>{num(schoolMetrics?.students)}</strong><small>{semester?'Trong học kỳ đã chọn':'Hồ sơ sinh viên hiện hành'}</small></article><article className="ad585-kpi"><div className="ad585-kpi-icon"><School/></div><span>Lớp học phần</span><strong>{num(schoolMetrics?.classes)}</strong><small>{semester?'Trong học kỳ đã chọn':'Toàn bộ Warehouse'}</small></article><article className="ad585-kpi"><div className="ad585-kpi-icon"><BookOpen/></div><span>Lượt đăng ký học</span><strong>{num(schoolMetrics?.enrollments)}</strong><small>Không phải số sinh viên duy nhất</small></article><article className="ad585-kpi"><div className="ad585-kpi-icon"><Activity/></div><span>Điểm đánh giá TB</span><strong>{grade(schoolMetrics?.grade)}</strong><small>Thang 10 · Không phải GPA</small></article></div>
   <div className="ad585-two"><section className="ad585-panel"><div className="ad585-panelhead"><div><h3>Chất lượng học tập</h3><p>Theo {semester?semester.semester_name:'toàn bộ Warehouse'}</p></div><Activity size={19}/></div><div className="ad585-progressgroup"><Progress label="Tỷ lệ có mặt" value={schoolMetrics?.attendance??null}/><Progress label="Tỷ lệ đã nộp bài" value={schoolMetrics?.assignments??null}/></div><p className="ad585-footnote">Có mặt chỉ tính trạng thái <strong>present</strong>; nộp bài gồm <strong>submitted</strong> và <strong>late</strong>.</p></section>
   <section className="ad585-panel"><div className="ad585-panelhead"><div><h3>Quy mô theo khoa</h3><p>Phân bố sinh viên trong Warehouse</p></div><School size={19}/></div><label className="ad585-selectlabel ad585-deptfilter">Khoa <select value={departmentKey} onChange={e=>setDepartmentKey(e.target.value)}><option value="all">Tất cả khoa</option>{analytics?.departments.map(d=><option value={d.department_key} key={d.department_key}>{d.department_name}</option>)}</select></label><div className="ad585-bars">{filteredDepartments.length?filteredDepartments.slice(0,8).map(d=><Bar key={d.department_key} label={d.department_name} value={d.total_students} max={Math.max(...filteredDepartments.map(x=>x.total_students),1)}/>):<p className="ad585-muted">Chưa có dữ liệu theo khoa.</p>}</div></section></div>
   </section>
   <section className="ad585-section"><div className="ad585-titlebar"><div><span className="ad585-overline">QUẢN TRỊ TRUY CẬP</span><h2>Tài khoản và an toàn hệ thống</h2><p>Chỉ tài khoản demo được tạo trong ba cổng, không đồng nghĩa với số sinh viên Warehouse.</p></div><Link className="ad585-viewlink" href="/admin/users">Quản lý tài khoản <ArrowRight size={16}/></Link></div><div className="ad585-two"><section className="ad585-panel"><div className="ad585-panelhead"><div><h3>Phân bố tài khoản</h3><p>{num(accounts.length)} tài khoản demo</p></div><Users size={19}/></div><div className="ad585-rolegrid">{(['student','lecturer','admin'] as const).map(role=><div key={role} className="ad585-role"><span>{roleLabels[role]}</span><strong>{num(roleCounts[role])}</strong><div className="ad585-track"><div style={{width:`${accounts.length?roleCounts[role]/accounts.length*100:0}%`}}/></div></div>)}</div><div className="ad585-status"><span><CheckCircle2 size={15}/> Đang hoạt động <strong>{counts.active}</strong></span><span><AlertCircle size={15}/> Vô hiệu hóa <strong>{counts.inactive}</strong></span></div></section>
   <section className="ad585-panel"><div className="ad585-panelhead"><div><h3>Nhật ký bảo mật gần đây</h3><p>{num(events.length)} bản ghi mới nhất được tải{security?.has_more?' · Còn các trang cũ hơn':''}</p></div><History size={19}/></div><div className="ad585-eventgrid"><div><span>Đăng nhập thành công</span><strong>{num(eventStats.success)}</strong></div><div><span>Đăng nhập thất bại</span><strong>{num(eventStats.failed)}</strong></div><div><span>Đăng xuất</span><strong>{num(eventStats.logout)}</strong></div></div><p className="ad585-footnote">Số đếm chỉ thuộc tối đa 100 sự kiện Admin mới nhất, không phải tổng lịch sử hoặc chỉ số an ninh toàn hệ thống.</p><Link href="/admin/security" className="ad585-viewlink">Xem nhật ký chi tiết <ArrowRight size={16}/></Link></section></div></section>
   <section className="ad585-section"><div className="ad585-titlebar"><div><span className="ad585-overline">THAO TÁC NHANH</span><h2>Không gian quản trị</h2></div></div><div className="ad585-shortcuts"><Shortcut href="/" icon={<LayoutDashboard/>} title="Phân tích đào tạo" desc="Thống kê đào tạo tổng hợp"/><Shortcut href="/admin/users" icon={<Users/>} title="Quản lý tài khoản" desc="Trạng thái và lịch sử thay đổi"/><Shortcut href="/admin/security" icon={<ShieldCheck/>} title="Nhật ký bảo mật" desc="Sự kiện đăng nhập và quản trị"/><Shortcut href="/reports" icon={<FileText/>} title="Trung tâm báo cáo" desc="Xem và xuất báo cáo được cấp quyền"/></div></section>
   <p className="ad58-note">Các chỉ số đào tạo lấy từ Warehouse mô phỏng. Bộ lọc học kỳ áp dụng cho chỉ số và tỷ lệ đào tạo; biểu đồ khoa là thống kê tổng thể theo khoa, không giả định có dữ liệu theo khoa–học kỳ. Báo cáo bảo mật chỉ phản ánh các sự kiện Admin được ghi nhận trong Phase 5.8.4.</p>
  </>}
 </div></main>;
}
function Progress({label,value}:{label:string;value:number|null}){const safe=value==null?0:Math.max(0,Math.min(value,100));return <div className="ad585-progress"><div className="ad585-prow"><span>{label}</span><strong>{percent(value)}</strong></div><div className="ad585-track"><div style={{width:`${safe}%`}}/></div></div>}
function Bar({label,value,max}:{label:string;value:number;max:number}){return <div className="ad585-bar"><div className="ad585-prow"><span title={label}>{label}</span><strong>{num(value)}</strong></div><div className="ad585-track"><div style={{width:`${Math.max(0,Math.min(100,value/max*100))}%`}}/></div></div>}
function Shortcut({href,icon,title,desc}:{href:string;icon:React.ReactNode;title:string;desc:string}){return <Link href={href} className="ad585-shortcut"><span className="ad585-shorticon">{icon}</span><span><strong>{title}</strong><small>{desc}</small></span><ArrowRight size={16}/></Link>}
