import {NextRequest,NextResponse} from 'next/server';
import {adminAuthorization, ADMIN_BACKEND, sameOrigin} from '@/lib/admin-auth';
const headers={'Cache-Control':'private, no-store'};
export async function PATCH(req:NextRequest, context:{params:Promise<{role:string;username:string}>}){
  if(!sameOrigin(req)) return NextResponse.json({error:'Nguồn yêu cầu không hợp lệ.'},{status:403,headers});
  const auth=adminAuthorization(req);
  if(!auth) return NextResponse.json({error:'Cần đăng nhập quản trị viên.'},{status:401,headers});
  const {role,username}=await context.params;
  if(!['student','lecturer','admin'].includes(role) || !/^[\w.\-]{1,80}$/.test(username))
    return NextResponse.json({error:'Tài khoản không hợp lệ.'},{status:400,headers});
  const body:unknown=await req.json().catch(()=>null);
  if(!body||typeof body!=='object') return NextResponse.json({error:'Dữ liệu không hợp lệ.'},{status:400,headers});
  const data=body as {is_active?:unknown;reason?:unknown};
  if(typeof data.is_active!=='boolean'||typeof data.reason!=='string'||data.reason.trim().length<8||data.reason.length>500)
    return NextResponse.json({error:'Trạng thái hoặc lý do không hợp lệ.'},{status:422,headers});
  try {
    const upstream=await fetch(`${ADMIN_BACKEND}/api/v1/demo-admin/users/${role}/${encodeURIComponent(username)}/status`,{
      method:'PATCH',headers:{Authorization:auth,'Content-Type':'application/json'},
      body:JSON.stringify({is_active:data.is_active,reason:data.reason.trim()}),
      cache:'no-store',signal:AbortSignal.timeout(10000),
    });
    const result:unknown=await upstream.json().catch(()=>({error:'Máy chủ không trả dữ liệu hợp lệ.'}));
    return NextResponse.json(result,{status:upstream.status,headers});
  }catch{return NextResponse.json({error:'Không kết nối được máy chủ.'},{status:503,headers});}
}
