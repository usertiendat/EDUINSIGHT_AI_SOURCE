'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ShieldCheck,Users,GraduationCap,BookOpen,LogOut,LayoutDashboard,FileText,History} from 'lucide-react';
import './admin.css';
type User={username:string;display_name:string;role:string;is_active:boolean;created_at:string};
type Me={username:string;display_name:string;role:string;session_expires_at:string};
export default function AdminDashboard(){
  const router=useRouter();const [me,setMe]=useState<Me|null>(null);
  const [users,setUsers]=useState<User[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;(async()=>{
    try {
      const [m,u]=await Promise.all([fetch('/api/admin-session/me',{cache:'no-store'}),fetch('/api/admin-session/users',{cache:'no-store'})]);
      if(m.status===401||u.status===401){router.replace('/login');return;}
      if(!m.ok||!u.ok) throw new Error('Không thể tải thông tin quản trị.');
      const md=(await m.json()) as {data:Me};const ud=(await u.json()) as {data:User[]};
      if(active){setMe(md.data);setUsers(ud.data);}
    }catch(e){if(active)setError(e instanceof Error?e.message:'Lỗi không xác định');}
    finally{if(active)setLoading(false);}
  })();return()=>{active=false};},[router]);
  async function logout(){setBusy(true);setError('');try{
    const r=await fetch('/api/admin-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});
    if(!r.ok)throw new Error('Chưa xác nhận được đăng xuất.');router.replace('/login');router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Đăng xuất thất bại');}finally{setBusy(false);}}
  return <main className="ad58">
    <div className="ad58-wrap">
      <header className="ad58-head"><div className="ad58-brand"><ShieldCheck size={28}/><span><strong>EduInsight AI</strong><small>Không gian quản trị · Phase 5.8</small></span></div><button className="ad58-logout" onClick={logout} disabled={busy}><LogOut size={16}/> Đăng xuất</button></header>
      <div className="ad58-intro"><p>QUẢN TRỊ HỆ THỐNG · DỮ LIỆU MÔ PHỎNG</p><h1>Tổng quan quyền truy cập</h1><span>{me?`Xin chào, ${me.display_name}`:'Đang xác thực phiên Admin...'}</span></div>
      {error&&<div role="alert" className="ad58-error">{error}</div>}
      {loading?<p>Đang tải dữ liệu tài khoản...</p>:me&&<>
        <div className="ad58-kpis">
          <section><Users/><span>Tài khoản demo</span><strong>{users.length}</strong></section>
          <section><GraduationCap/><span>Sinh viên</span><strong>{users.filter(u=>u.role==='student').length}</strong></section>
          <section><BookOpen/><span>Giảng viên</span><strong>{users.filter(u=>u.role==='lecturer').length}</strong></section>
          <section><ShieldCheck/><span>Quản trị viên</span><strong>{users.filter(u=>u.role==='admin').length}</strong></section>
        </div>
        <section className="ad58-card"><h2>Điều hướng quản trị</h2><div className="ad58-links"><Link href="/"><LayoutDashboard/>Dashboard phân tích</Link><Link href="/students"><Users/>Sinh viên</Link><Link href="/admin/users"><Users/>Quản lý tài khoản</Link><Link href="/admin/security"><History/>Nhật ký bảo mật</Link><Link href="/reports"><FileText/>Trung tâm báo cáo</Link></div></section>
        <section className="ad58-card"><div className="ad58-cardhead"><h2>Danh sách tài khoản</h2><span>Thao tác quản lý tại mục Quản lý tài khoản</span></div><div className="ad58-table"><table><thead><tr><th>Tên đăng nhập</th><th>Tên hiển thị</th><th>Vai trò</th><th>Trạng thái</th></tr></thead><tbody>{users.map(u=><tr key={`${u.role}-${u.username}`}><td>{u.username}</td><td>{u.display_name}</td><td>{u.role==='student'?'Sinh viên':u.role==='lecturer'?'Giảng viên':'Quản trị viên'}</td><td>{u.is_active?'Hoạt động':'Vô hiệu hóa'}</td></tr>)}</tbody></table></div></section>
        <p className="ad58-note">Dữ liệu mô phỏng. Các API Analytics và Sinh viên yêu cầu phiên Admin hợp lệ. Quản lý trạng thái tài khoản và nhật ký thay đổi nằm trong mục Quản lý tài khoản; các quyền nâng cao tiếp tục được triển khai ở giai đoạn riêng.</p>
      </>}
    </div>
  </main>;
}
