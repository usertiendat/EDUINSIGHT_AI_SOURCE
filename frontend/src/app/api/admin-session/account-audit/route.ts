import {NextRequest,NextResponse} from 'next/server';
import {adminAuthorization,ADMIN_BACKEND} from '@/lib/admin-auth';
export async function GET(req:NextRequest){
 const auth=adminAuthorization(req);
 if(!auth)return NextResponse.json({error:'Cần đăng nhập quản trị viên.'},{status:401,headers:{'Cache-Control':'no-store'}});
 try{
  const up=await fetch(`${ADMIN_BACKEND}/api/v1/demo-admin/account-audit`,{headers:{Authorization:auth},cache:'no-store',signal:AbortSignal.timeout(10000)});
  const body=await up.json().catch(()=>({error:'Phản hồi không hợp lệ.'}));
  return NextResponse.json(body,{status:up.status,headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Không kết nối được máy chủ.'},{status:503});}
}
