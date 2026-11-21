import { NextRequest, NextResponse } from "next/server";
const BACKEND = process.env.EDUINSIGHT_BACKEND_URL || "http://127.0.0.1:8000";
const COOKIE = "eduinsight_lecturer_session";
const headers = {"Cache-Control":"private, no-store, max-age=0"};
export async function GET(req:NextRequest){
 const token=req.cookies.get(COOKIE)?.value;
 if(!token)return NextResponse.json({error:"Cần đăng nhập giảng viên."},{status:401,headers});
 try{
  const upstream=await fetch(`${BACKEND}/api/v1/demo-lecturer/session`,{
   headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(10000),
  });
  if(upstream.status===401){
   const res=NextResponse.json({error:"Phiên đăng nhập đã hết hạn."},{status:401,headers});
   res.cookies.delete(COOKIE);return res;
  }
  if(!upstream.ok)return NextResponse.json({error:"Không tải được thông tin phiên."},{status:502,headers});
  return NextResponse.json(await upstream.json(),{headers});
 }catch{return NextResponse.json({error:"Không kết nối được máy chủ."},{status:503,headers});}
}
