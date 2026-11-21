import {NextRequest,NextResponse} from 'next/server';
import {adminAuthorization,ADMIN_BACKEND} from '@/lib/admin-auth';
export async function GET(req:NextRequest){
  const auth=adminAuthorization(req);
  if (!auth) return NextResponse.json({error:'Cần đăng nhập Admin.'},{status:401});
  try {
    const upstream=await fetch(`${ADMIN_BACKEND}/api/v1/demo-admin/users`,{
      headers:{Authorization:auth},cache:'no-store',signal:AbortSignal.timeout(10000),
    });
    if (!upstream.ok) return NextResponse.json({error:'Không thể truy vấn danh sách tài khoản.'},{status:upstream.status===401?401:502});
    return NextResponse.json(await upstream.json(),{headers:{'Cache-Control':'private, no-store'}});
  } catch {return NextResponse.json({error:'Không kết nối được máy chủ.'},{status:503});}
}
