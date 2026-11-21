'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ShieldCheck,ArrowLeft,RefreshCw,History,AlertTriangle} from 'lucide-react';
import '../dashboard/admin.css';
import './security.css';

type EventName='admin_login_success'|'admin_login_failed'|'admin_logout'|'account_activated'|'account_deactivated';
type EventItem={event_id:number;event_type:EventName;actor_username:string;result:'success'|'failure';target_role:string|null;target_username:string|null;occurred_at:string};
type Page={items:EventItem[];next_before_id:number|null;has_more:boolean};
const labels:Record<EventName,string>={admin_login_success:'Đăng nhập thành công',admin_login_failed:'Đăng nhập thất bại',admin_logout:'Đăng xuất',account_activated:'Kích hoạt tài khoản',account_deactivated:'Vô hiệu hóa tài khoản'};
export default function SecurityPage(){
 const router=useRouter();
 const latestRequest=useRef(0);
 const [items,setItems]=useState<EventItem[]>([]),[eventType,setEventType]=useState(''),
 [cursor,setCursor]=useState<number|null>(null),[hasMore,setHasMore]=useState(false),
 [loading,setLoading]=useState(false),[error,setError]=useState('');
 const load=useCallback(async(nextCursor:number|null,append:boolean,type:string)=>{
  const requestId=++latestRequest.current;
  setLoading(true);setError('');
  try{
   const params=new URLSearchParams({limit:'30'});
   if(nextCursor!==null)params.set('before_id',String(nextCursor));
   if(type)params.set('event_type',type);
   const r=await fetch(`/api/admin-session/security-events?${params}`,{cache:'no-store'});
   if(r.status===401||r.status===403){router.replace('/login');return;}
   const body=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(body.detail||body.error||'Không tải được nhật ký bảo mật.');
   const data=body.data as Page;
   if(!data||!Array.isArray(data.items))throw new Error('Phản hồi không hợp lệ.');
   if(requestId!==latestRequest.current)return;
   setItems(old=>append?[...old,...data.items]:data.items);
   setCursor(data.next_before_id);setHasMore(data.has_more);
  }catch(e){if(requestId===latestRequest.current)setError(e instanceof Error?e.message:'Có lỗi xảy ra.');}
  finally{if(requestId===latestRequest.current)setLoading(false);}
 },[router]);
 useEffect(()=>{void load(null,false,eventType);},[load,eventType]);
 return <main className="ad58"><div className="ad58-wrap">
  <div className="ad58-sec-top"><Link href="/admin/dashboard"><ArrowLeft size={17}/> Về trang quản trị</Link><span><ShieldCheck size={17}/> Chỉ quản trị viên</span></div>
  <div className="ad58-intro"><p>PHASE 5.8.4 · AN TOÀN HỆ THỐNG</p><h1>Nhật ký bảo mật</h1><span>Theo dõi sự kiện xác thực và thay đổi trạng thái tài khoản mô phỏng.</span></div>
  <section className="ad58-sec-banner"><History size={21}/><div><strong>Nhật ký chỉ đọc và có phân quyền</strong><p>Không lưu mật khẩu, token hoặc cookie. Hiển thị 30 sự kiện mỗi lần tải.</p></div></section>
  <section className="ad58-card"><div className="ad58-cardhead"><div><h2>Lịch sử sự kiện</h2><p className="ad58-sec-help">Mới nhất trước · Lọc theo loại sự kiện</p></div><button type="button" className="ad58-sec-btn" disabled={loading} onClick={()=>void load(null,false,eventType)}><RefreshCw size={16}/> Làm mới</button></div>
   <div className="ad58-sec-toolbar"><label htmlFor="eventType">Loại sự kiện</label><select id="eventType" value={eventType} disabled={loading} onChange={e=>setEventType(e.target.value)}><option value="">Tất cả sự kiện</option>{(Object.keys(labels) as EventName[]).map(k=><option key={k} value={k}>{labels[k]}</option>)}</select></div>
   {error&&<div className="ad58-error" role="alert"><AlertTriangle size={16}/>{error}</div>}
   <div className="ad58-table"><table><thead><tr><th>Thời gian</th><th>Sự kiện</th><th>Người thực hiện</th><th>Đối tượng</th><th>Kết quả</th></tr></thead><tbody>
    {items.map(item=><tr key={item.event_id}><td>{new Date(item.occurred_at).toLocaleString('vi-VN')}</td><td><strong>{labels[item.event_type]||item.event_type}</strong></td><td>{item.actor_username}</td><td>{item.target_username?`${item.target_username} (${item.target_role})`:'—'}</td><td><span className={`ad58-sec-state ${item.result==='success'?'is-success':'is-failure'}`}>{item.result==='success'?'Thành công':'Thất bại'}</span></td></tr>)}
    {!loading&&items.length===0&&<tr><td colSpan={5} className="ad58-sec-empty">Chưa có sự kiện trong phạm vi lọc.</td></tr>}
   </tbody></table></div>
   <div className="ad58-sec-footer"><span>Đã hiển thị {items.length} sự kiện</span>{hasMore&&<button type="button" className="ad58-sec-btn" disabled={loading||cursor===null} onClick={()=>void load(cursor,true,eventType)}>{loading?'Đang tải...':'Tải thêm'}</button>}</div>
  </section>
  <p className="ad58-note">Nhật ký bảo mật là dữ liệu mô phỏng. Việc phát hiện bất thường, giới hạn tốc độ trên toàn hệ thống và lưu trữ tập trung cần được đánh giá trong đợt kiểm thử bảo mật riêng.</p>
 </div></main>;
}
