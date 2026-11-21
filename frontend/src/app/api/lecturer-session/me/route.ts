import { NextRequest, NextResponse } from "next/server";
const BACKEND = process.env.EDUINSIGHT_BACKEND_URL || "http://127.0.0.1:8000";
const COOKIE = "eduinsight_lecturer_session";
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return NextResponse.json({error:"Cần đăng nhập giảng viên."},{status:401,headers:{"Cache-Control":"no-store"}});
  try {
    const result = await fetch(`${BACKEND}/api/v1/demo-lecturer/me`,{
      headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(10000),
    });
    if (result.status === 401) {
      const response=NextResponse.json({error:"Phiên giảng viên đã hết hạn."},{status:401});
      response.cookies.delete(COOKIE);return response;
    }
    if (!result.ok) return NextResponse.json({error:"Không tải được dữ liệu giảng viên."},{status:502,headers:{"Cache-Control":"no-store"}});
    return NextResponse.json(await result.json(),{headers:{"Cache-Control":"private, no-store, max-age=0"}});
  } catch {return NextResponse.json({error:"Không kết nối được dịch vụ dữ liệu."},{status:503,headers:{"Cache-Control":"no-store"}});}
}
