'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,Search,RefreshCw,ShieldCheck,Users,LockKeyhole,History,CheckCircle2,AlertTriangle} from 'lucide-react';
import '../dashboard/admin.css';
import './users.css';
type Account={username:string;display_name:string;role:'student'|'lecturer'|'admin';is_active:boolean;created_at:string};
type Audit={audit_id:number;actor_username:string;target_role:string;target_username:string;previous_active:boolean;new_active:boolean;reason:string;sessions_revoked:number;created_at:string};
type ApiResult<T>={status:string;data:T;detail?:string;error?:string};
const roleLabel:Record<Account['role'],string>={student:'Sinh viên',lecturer:'Giảng viên',admin:'Quản trị viên'};
export default function AdminUsersPage(){
 const router=useRouter();
 const [users,setUsers]=useState<Account[]>([]),[audit,setAudit]=useState<Audit[]>([]);
 const [actor,setActor]=useState(''),[search,setSearch]=useState(''),[role,setRole]=useState('all'),[status,setStatus]=useState('all');
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [selected,setSelected]=useState<Account|null>(null),[reason,setReason]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const [me,u,a]=await Promise.all([
    fetch('/api/admin-session/me',{cache:'no-store'}),
    fetch('/api/admin-session/users',{cache:'no-store'}),
    fetch('/api/admin-session/account-audit',{cache:'no-store'})
   ]);
   if([me,u,a].some(r=>r.status===401)){router.replace('/login');return;}
   if(!me.ok||!u.ok||!a.ok)throw new Error('Không thể tải dữ liệu quản lý tài khoản. Kiểm tra migration Phase 5.8.2.');
   const [my,ur,ar]=await Promise.all([me.json() as Promise<ApiResult<{username:string}>>,u.json() as Promise<ApiResult<Account[]>>,a.json() as Promise<ApiResult<Audit[]>>]);
   setActor(my.data.username);setUsers(ur.data);setAudit(ar.data);
  }catch(e){setError(e instanceof Error?e.message:'Có lỗi xảy ra.');}
  finally{setLoading(false);}
 },[router]);
 useEffect(()=>{void load();},[load]);
 const filtered=useMemo(()=>users.filter(u=>{
  const q=search.trim().toLocaleLowerCase('vi');
  return (!q||`${u.username} ${u.display_name}`.toLocaleLowerCase('vi').includes(q))&&
   (role==='all'||u.role===role)&&(status==='all'||String(u.is_active)===status);
 }),[users,search,role,status]);
 function openDialog(user:Account){setSelected(user);setReason('');setError('');setNotice('');}
 async function submit(){
  if(!selected||reason.trim().length<8||busy)return;
  setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch(`/api/admin-session/users/${selected.role}/${encodeURIComponent(selected.username)}`,{
    method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({is_active:!selected.is_active,reason:reason.trim()})
   });
   const payload=await response.json().catch(()=>({}));
   if(response.status===401){router.replace('/login');return;}
   if(!response.ok)throw new Error(payload.detail||payload.error||'Không thể cập nhật trạng thái.');
   setSelected(null);setNotice(`Đã ${selected.is_active?'vô hiệu hóa':'kích hoạt'} ${selected.username}.`);
   await load();
  }catch(e){setError(e instanceof Error?e.message:'Thao tác thất bại.');}
  finally{setBusy(false);}
 }
 const activeAdmins=users.filter(u=>u.role==='admin'&&u.is_active).length;
 return <main className="ad58"><div className="ad58-wrap">
  <div className="ad58-user-top"><Link href="/admin/dashboard"><ArrowLeft size={18}/> Trở về Dashboard</Link><span><ShieldCheck size={18}/> Không gian quản trị · Dữ liệu mô phỏng</span></div>
  <div className="ad58-intro"><p>PHASE 5.8.2 · QUẢN LÝ TÀI KHOẢN</p><h1>Quản lý người dùng</h1><span>Theo dõi tài khoản theo vai trò, kiểm soát trạng thái và lịch sử thay đổi.</span></div>
  {error&&<div className="ad58-error" role="alert">{error}</div>}
  {notice&&<div className="ad58-success" role="status"><CheckCircle2 size={18}/>{notice}</div>}
  <div className="ad58-kpis ad58-user-kpis">
   <section><Users/><span>Tổng tài khoản</span><strong>{users.length}</strong></section>
   <section><CheckCircle2/><span>Đang hoạt động</span><strong>{users.filter(u=>u.is_active).length}</strong></section>
   <section><LockKeyhole/><span>Đã vô hiệu hóa</span><strong>{users.filter(u=>!u.is_active).length}</strong></section>
   <section><ShieldCheck/><span>Admin hoạt động</span><strong>{activeAdmins}</strong></section>
  </div>
  <section className="ad58-card">
   <div className="ad58-cardhead"><div><h2>Danh sách tài khoản</h2><p className="ad58-muted">Chỉ thay đổi trạng thái đăng nhập; không xóa dữ liệu học tập.</p></div><button className="ad58-btn" disabled={loading} onClick={()=>void load()}><RefreshCw size={16}/> Làm mới</button></div>
   <div className="ad58-filters"><label className="ad58-search"><Search size={17}/><input aria-label="Tìm tài khoản" placeholder="Tìm tên đăng nhập hoặc tên hiển thị" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <select aria-label="Lọc vai trò" value={role} onChange={e=>setRole(e.target.value)}><option value="all">Tất cả vai trò</option><option value="student">Sinh viên</option><option value="lecturer">Giảng viên</option><option value="admin">Quản trị viên</option></select>
    <select aria-label="Lọc trạng thái" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Tất cả trạng thái</option><option value="true">Hoạt động</option><option value="false">Vô hiệu hóa</option></select></div>
   <div className="ad58-table"><table><thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead><tbody>
    {filtered.map(u=><tr key={`${u.role}:${u.username}`}><td><strong>{u.display_name}</strong><div className="ad58-muted">{u.username}</div></td><td>{roleLabel[u.role]}</td><td><span className={`ad58-state ${u.is_active?'is-active':'is-inactive'}`}>{u.is_active?'Hoạt động':'Vô hiệu hóa'}</span></td><td>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td><td><button className="ad58-action" disabled={loading||(u.role==='admin'&&u.username===actor)||(u.role==='admin'&&u.is_active&&activeAdmins<=1)} onClick={()=>openDialog(u)}>{u.is_active?'Vô hiệu hóa':'Kích hoạt'}</button></td></tr>)}
    {!loading&&filtered.length===0&&<tr><td colSpan={5} className="ad58-empty">Không tìm thấy tài khoản phù hợp.</td></tr>}
   </tbody></table></div>
  </section>
  <section className="ad58-card"><div className="ad58-cardhead"><h2><History size={19}/> Nhật ký thay đổi tài khoản</h2><span>50 sự kiện gần nhất</span></div>
   <div className="ad58-table"><table><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Tài khoản</th><th>Thao tác</th><th>Phiên thu hồi</th><th>Lý do</th></tr></thead><tbody>
    {audit.map(a=><tr key={a.audit_id}><td>{new Date(a.created_at).toLocaleString('vi-VN')}</td><td>{a.actor_username}</td><td>{a.target_username} <span className="ad58-muted">({a.target_role})</span></td><td>{a.new_active?'Kích hoạt':'Vô hiệu hóa'}</td><td>{a.sessions_revoked}</td><td className="ad58-reason">{a.reason}</td></tr>)}
    {!loading&&audit.length===0&&<tr><td colSpan={6} className="ad58-empty">Chưa có thao tác thay đổi trạng thái nào.</td></tr>}
   </tbody></table></div>
  </section>
  {selected&&<div className="ad58-modalback" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setSelected(null)}}><div className="ad58-modal" role="dialog" aria-modal="true" aria-labelledby="change-status-title">
   <div className="ad58-modal-title"><AlertTriangle/><h2 id="change-status-title">{selected.is_active?'Xác nhận vô hiệu hóa':'Xác nhận kích hoạt'}</h2></div>
   <p><strong>{selected.display_name}</strong> ({selected.username}) — {roleLabel[selected.role]}</p>
   <p className="ad58-muted">{selected.is_active?'Các phiên đăng nhập hiện tại sẽ bị thu hồi. Dữ liệu học tập không bị xóa.':'Người dùng có thể đăng nhập lại bằng thông tin hiện có.'}</p>
   <label className="ad58-reason-label">Lý do thay đổi (ít nhất 8 ký tự)<textarea value={reason} maxLength={500} rows={3} onChange={e=>setReason(e.target.value)} placeholder="Ví dụ: Tài khoản mô phỏng tạm ngừng sử dụng"/></label>
   <div className="ad58-modal-actions"><button className="ad58-btn" disabled={busy} onClick={()=>setSelected(null)}>Hủy</button><button className="ad58-primary" disabled={busy||reason.trim().length<8} onClick={()=>void submit()}>{busy?'Đang lưu...':'Xác nhận thay đổi'}</button></div>
  </div></div>}
  <p className="ad58-note">Tài khoản Admin đang sử dụng và Admin cuối cùng không được phép tự vô hiệu hóa. Mọi thay đổi được ghi nhận tại máy chủ.</p>
 </div></main>;
}
