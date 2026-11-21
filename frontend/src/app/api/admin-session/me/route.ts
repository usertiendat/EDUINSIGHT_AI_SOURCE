import {NextRequest,NextResponse} from 'next/server';
import {adminAuthorization,ADMIN_BACKEND,ADMIN_COOKIE} from '@/lib/admin-auth';
export async function GET(req:NextRequest){
  const auth=adminAuthorization(req);
  if (!auth) return NextResponse.json({error:'Cần đăng nhập Admin.'},{status:401,headers:{'Cache-Control':'no-store'}});
  try {
    const upstream=await fetch(`${ADMIN_BACKEND}/api/v1/demo-admin/me`,{
      headers:{Authorization:auth},cache:'no-store',signal:AbortSignal.timeout(10000),
    });
    if (upstream.status===401) {const res=NextResponse.json({error:'Phiên Admin đã hết hạn.'},{status:401});res.cookies.delete(ADMIN_COOKIE);return res;}
    if (!upstream.ok) return NextResponse.json({error:'Không thể xác thực tài khoản quản trị.'},{status:502});
    return NextResponse.json(await upstream.json(),{headers:{'Cache-Control':'private, no-store'}});
  } catch {return NextResponse.json({error:'Không kết nối được máy chủ.'},{status:503});}
}
