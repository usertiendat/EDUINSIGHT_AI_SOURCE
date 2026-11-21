import { NextRequest, NextResponse } from "next/server";
const BACKEND = process.env.EDUINSIGHT_BACKEND_URL || "http://127.0.0.1:8000";
const COOKIE = "eduinsight_lecturer_session";
export async function GET(req: NextRequest,{params}:{params:Promise<{classKey:string}>}) {
  const token=req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({error:"Cần đăng nhập giảng viên."},{status:401,headers:{"Cache-Control":"no-store"}});
  const {classKey}=await params;
  if (!/^\d{1,9}$/.test(classKey) || Number(classKey)<1) return NextResponse.json({error:"Mã lớp không hợp lệ."},{status:400});
  try {
    const result=await fetch(`${BACKEND}/api/v1/demo-lecturer/classes/${classKey}`,{
      headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(10000),
    });
    if(result.status===401){const response=NextResponse.json({error:"Phiên đã hết hạn."},{status:401});response.cookies.delete(COOKIE);return response;}
    if(result.status===404)return NextResponse.json({error:"Không tìm thấy lớp thuộc quyền phụ trách."},{status:404});
    if(!result.ok)return NextResponse.json({error:"Không thể tải danh sách lớp."},{status:502});
    return NextResponse.json(await result.json(),{headers:{"Cache-Control":"private, no-store, max-age=0"}});
  } catch{return NextResponse.json({error:"Không kết nối được máy chủ."},{status:503});}
}
