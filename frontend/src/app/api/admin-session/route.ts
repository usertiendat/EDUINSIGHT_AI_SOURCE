import { NextRequest,NextResponse } from 'next/server';
import {ADMIN_COOKIE,ADMIN_BACKEND,sameOrigin,adminAuthorization} from '@/lib/admin-auth';
const headers={'Cache-Control':'no-store'};

export async function POST(req:NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({error:'Yêu cầu không hợp lệ.'},{status:403,headers});
  const raw:unknown=await req.json().catch(()=>null);
  if (!raw || typeof raw!=='object') return NextResponse.json({error:'Dữ liệu không hợp lệ.'},{status:400,headers});
  const data=raw as {action?:unknown;username?:unknown;password?:unknown};
  if (data.action==='logout') {
    const auth=adminAuthorization(req);
    if (auth) {
      try {
        const upstream=await fetch(`${ADMIN_BACKEND}/api/v1/demo-admin/logout`,{
          method:'POST',headers:{Authorization:auth},cache:'no-store',signal:AbortSignal.timeout(10000),
        });
        if (!upstream.ok && upstream.status!==401) return NextResponse.json({error:'Máy chủ chưa xác nhận đăng xuất.'},{status:503,headers});
      } catch { return NextResponse.json({error:'Mất kết nối, chưa xác nhận thu hồi phiên.'},{status:503,headers}); }
    }
    const response=NextResponse.json({ok:true},{headers});response.cookies.delete(ADMIN_COOKIE);return response;
  }
  if (data.action!=='login' || typeof data.username!=='string' || typeof data.password!=='string' ||
      data.username.length<3 || data.username.length>80 || !data.password || data.password.length>256)
    return NextResponse.json({error:'Thông tin đăng nhập không hợp lệ.'},{status:400,headers});
  try {
    const upstream=await fetch(`${ADMIN_BACKEND}/api/v1/demo-admin/login`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username:data.username.trim(),password:data.password}),
      cache:'no-store',signal:AbortSignal.timeout(10000),
    });
    if (upstream.status===401) return NextResponse.json({error:'Tên đăng nhập hoặc mật khẩu không đúng.'},{status:401,headers});
    if (!upstream.ok) return NextResponse.json({error:'Dịch vụ xác thực Admin chưa sẵn sàng.'},{status:503,headers});
    const result:unknown=await upstream.json();
    const token=result && typeof result==='object' ? (result as {access_token?:unknown}).access_token : undefined;
    if (typeof token!=='string' || token.length<30) throw new Error('Bad token');
    const response=NextResponse.json({ok:true},{headers});
    response.cookies.set(ADMIN_COOKIE,token,{
      httpOnly:true,secure:req.nextUrl.protocol==='https:',sameSite:'strict',path:'/',maxAge:28800,
    });return response;
  } catch {return NextResponse.json({error:'Không kết nối được dịch vụ đăng nhập.'},{status:503,headers});}
}
