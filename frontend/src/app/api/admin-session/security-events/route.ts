import {NextRequest,NextResponse} from 'next/server';
import {adminAuthorization,ADMIN_BACKEND} from '@/lib/admin-auth';

export async function GET(req:NextRequest){
 const auth=adminAuthorization(req);
 if(!auth)return NextResponse.json({error:'Cần đăng nhập quản trị viên.'},{status:401,headers:{'Cache-Control':'no-store'}});
 const upstream=new URL(`${ADMIN_BACKEND}/api/v1/demo-admin/security-events`);
 for(const key of ['limit','before_id','event_type']){
  const value=req.nextUrl.searchParams.get(key);if(value!==null)upstream.searchParams.set(key,value);
 }
 try{
  const response=await fetch(upstream.toString(),{headers:{Authorization:auth},cache:'no-store',signal:AbortSignal.timeout(10000)});
  const body=await response.json().catch(()=>({error:'Phản hồi không hợp lệ.'}));
  return NextResponse.json(body,{status:response.status,headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Không thể kết nối máy chủ.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
