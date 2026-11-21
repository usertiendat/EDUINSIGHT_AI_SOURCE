"use client";

import {useCallback, useEffect, useState, type FormEvent} from "react";
import {Clock3, KeyRound, LockKeyhole, LogOut, ShieldCheck, UserRound} from "lucide-react";

type SessionInfo = {created_at:string;expires_at:string;active_sessions:number};
const formatDate=(raw:string)=>{
 const parsed=new Date(raw);
 return Number.isNaN(parsed.getTime())?"Chưa xác định":new Intl.DateTimeFormat("vi-VN",{dateStyle:"medium",timeStyle:"short"}).format(parsed);
};

export default function LecturerSecurity({name,username,onReauth}:{name:string;username:string;onReauth:()=>void}){
 const [session,setSession]=useState<SessionInfo|null>(null);
 const [loading,setLoading]=useState(true);
 const [sessionError,setSessionError]=useState("");
 const [oldPassword,setOldPassword]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const [confirmPassword,setConfirmPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [formError,setFormError]=useState("");
 const [actionError,setActionError]=useState("");
 const load=useCallback(async()=>{
   setLoading(true);setSessionError("");
   try{
     const res=await fetch("/api/lecturer-session/profile",{cache:"no-store"});
     if(res.status===401){onReauth();return;}
     const payload=await res.json().catch(()=>({}));
     if(!res.ok)throw Error(payload.error||"Không tải được thông tin phiên.");
     if(!payload?.data || typeof payload.data.active_sessions!=="number")throw Error("Thông tin phiên không đúng định dạng.");
     setSession(payload.data as SessionInfo);
   }catch(e){setSessionError(e instanceof Error?e.message:"Lỗi kết nối.");}
   finally{setLoading(false);}
 },[onReauth]);
 useEffect(()=>{void load();},[load]);

 async function postAction(action:"change-password"|"logout-all"){
  const res=await fetch("/api/lecturer-session",{
   method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},
   body:JSON.stringify(action==="change-password"?{action,current_password:oldPassword,new_password:newPassword}:{action}),
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok){
   if(res.status===401){onReauth();throw Error("Phiên đăng nhập đã hết hạn.");}
   throw Error(data.error||"Máy chủ chưa xác nhận thao tác.");
  }
  onReauth();
 }
 async function changePassword(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setFormError("");
  if(newPassword.length<12||newPassword.length>128){setFormError("Mật khẩu mới phải dài từ 12 đến 128 ký tự.");return;}
  if(newPassword!==confirmPassword){setFormError("Xác nhận mật khẩu không trùng khớp.");return;}
  if(oldPassword===newPassword){setFormError("Mật khẩu mới phải khác mật khẩu cũ.");return;}
  setBusy(true);
  try{await postAction("change-password");setOldPassword("");setNewPassword("");setConfirmPassword("");}
  catch(e){setFormError(e instanceof Error?e.message:"Không thể đổi mật khẩu.");}
  finally{setBusy(false);}
 }
 async function logoutAll(){
  if(busy)return;
  if(!window.confirm("Thu hồi tất cả phiên đăng nhập giảng viên, kể cả phiên này?"))return;
  setBusy(true);setActionError("");
  try{await postAction("logout-all");}
  catch(e){setActionError(e instanceof Error?e.message:"Chưa thể thu hồi phiên.");}
  finally{setBusy(false);}
 }
 return <div className="lp-security-layout">
   <section className="lp-security-panel" aria-labelledby="lp-security-profile-title">
    <header className="lp-security-panel-head"><span className="lp-security-icon"><UserRound size={22}/></span><div><h2 id="lp-security-profile-title">Thông tin tài khoản</h2><p>Tài khoản mô phỏng dành riêng cho giảng viên.</p></div></header>
    <dl className="lp-security-details"><div><dt>Họ tên hiển thị</dt><dd>{name}</dd></div><div><dt>Tên đăng nhập</dt><dd>{username}</dd></div><div><dt>Vai trò</dt><dd>Giảng viên</dd></div><div><dt>Quyền truy cập</dt><dd>Chỉ các lớp CNTT được phân công</dd></div></dl>
    <div className="lp-security-tip"><ShieldCheck size={17}/>Không lưu mật khẩu vào trình duyệt hoặc chia sẻ mật khẩu cho người khác.</div>
   </section>
   <section className="lp-security-panel" aria-labelledby="lp-security-session-title">
    <header className="lp-security-panel-head"><span className="lp-security-icon lp-security-icon-green"><Clock3 size={22}/></span><div><h2 id="lp-security-session-title">Phiên đăng nhập</h2><p>Thông tin lấy từ máy chủ, không hiển thị mã phiên bí mật.</p></div></header>
    {loading?<p className="lp-security-status" role="status">Đang kiểm tra phiên...</p>:sessionError?<p className="lp-security-error" role="alert">{sessionError}</p>:session?<dl className="lp-security-details"><div><dt>Bắt đầu phiên hiện tại</dt><dd>{formatDate(session.created_at)}</dd></div><div><dt>Hết hạn phiên</dt><dd>{formatDate(session.expires_at)}</dd></div><div><dt>Phiên đang hoạt động</dt><dd>{session.active_sessions}</dd></div></dl>:null}
    <p className="lp-security-subnote">Phiên có thời hạn cố định. Hết hạn sẽ yêu cầu đăng nhập lại; hệ thống không tự động gia hạn.</p>
    {actionError&&<p role="alert" className="lp-security-error">{actionError}</p>}
    <button type="button" className="lp-security-secondary" disabled={busy||loading||!session} onClick={()=>void logoutAll()}><LogOut size={17}/> Đăng xuất khỏi tất cả phiên</button>
   </section>
   <section className="lp-security-panel lp-security-password" aria-labelledby="lp-security-pass-title">
    <header className="lp-security-panel-head"><span className="lp-security-icon lp-security-icon-violet"><LockKeyhole size={22}/></span><div><h2 id="lp-security-pass-title">Đổi mật khẩu giảng viên</h2><p>Xác minh mật khẩu hiện tại trước khi cập nhật.</p></div></header>
    <form onSubmit={e=>void changePassword(e)} className="lp-security-form">
     <label htmlFor="lecturer-old">Mật khẩu hiện tại</label><input id="lecturer-old" autoComplete="current-password" type="password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} required disabled={busy} maxLength={256}/>
     <label htmlFor="lecturer-new">Mật khẩu mới</label><input id="lecturer-new" autoComplete="new-password" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={12} maxLength={128} required disabled={busy}/>
     <label htmlFor="lecturer-confirm">Xác nhận mật khẩu mới</label><input id="lecturer-confirm" autoComplete="new-password" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} minLength={12} maxLength={128} required disabled={busy}/>
     <p className="lp-security-subnote">Từ 12 đến 128 ký tự. Sau khi đổi thành công, mọi phiên giảng viên sẽ bị thu hồi và bạn phải đăng nhập lại.</p>
     {formError&&<p role="alert" className="lp-security-error">{formError}</p>}
     <button disabled={busy} type="submit" className="lp-security-primary"><KeyRound size={17}/>{busy?"Đang xử lý...":"Cập nhật mật khẩu"}</button>
    </form>
   </section>
  </div>;
}
