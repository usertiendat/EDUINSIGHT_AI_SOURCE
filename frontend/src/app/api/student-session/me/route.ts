import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.EDUINSIGHT_BACKEND_URL || "http://127.0.0.1:8000";
export async function GET(req: NextRequest) {
  const token = req.cookies.get("eduinsight_demo_session")?.value;
  if (!token) return NextResponse.json({error:"Cần đăng nhập."},{status:401,headers:{"Cache-Control":"no-store"}});
  try {
    const response = await fetch(`${BACKEND}/api/v1/demo-auth/me`, {
      headers: {Authorization: `Bearer ${token}`}, cache:"no-store", signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401) {
      const res = NextResponse.json({error:"Phiên đăng nhập đã hết hạn."},{status:401});
      res.cookies.delete("eduinsight_demo_session");
      return res;
    }
    if (!response.ok) return NextResponse.json({error: response.status===403 ? "Không có quyền truy cập hồ sơ này." : "Không truy xuất được hồ sơ học tập."},{status:response.status===403?403:502,headers:{"Cache-Control":"no-store"}});
    const data = await response.json();
    const res = NextResponse.json(data);
    res.headers.set("Cache-Control", "private, no-store, max-age=0");
    return res;
  } catch {
    return NextResponse.json({error:"Không kết nối được dịch vụ dữ liệu."},{status:503});
  }
}
