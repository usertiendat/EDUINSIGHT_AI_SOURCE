import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.EDUINSIGHT_BACKEND_URL || "http://127.0.0.1:8000";
const COOKIE = "eduinsight_lecturer_session";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const value = new URL(origin);
    return value.host === req.nextUrl.host && value.protocol === req.nextUrl.protocol;
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({error:"Yêu cầu không hợp lệ."},{status:403,headers:noStore});
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error:"Dữ liệu không hợp lệ."},{status:400,headers:noStore});
  const action = (body as {action?:unknown}).action;
  if (action === "logout") {
    const token = req.cookies.get(COOKIE)?.value;
    if (token) {
      try {
        const upstream = await fetch(`${BACKEND}/api/v1/demo-lecturer/logout`,{
          method:"POST",headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(8000),
        });
        if (!upstream.ok && upstream.status !== 401) return NextResponse.json({error:"Máy chủ chưa xác nhận đăng xuất."},{status:503,headers:noStore});
      } catch {
        return NextResponse.json({error:"Không kết nối được máy chủ để đăng xuất."},{status:503,headers:noStore});
      }
    }
    const response = NextResponse.json({ok:true},{headers:noStore});
    response.cookies.delete(COOKIE);
    return response;
  }
  if (action !== "login") return NextResponse.json({error:"Thao tác không hợp lệ."},{status:400,headers:noStore});
  const {username,password} = body as {username?:unknown,password?:unknown};
  if (typeof username !== "string" || typeof password !== "string" || username.length < 3 || username.length > 80 || !password || password.length > 256)
    return NextResponse.json({error:"Thông tin đăng nhập không hợp lệ."},{status:400,headers:noStore});
  try {
    const upstream = await fetch(`${BACKEND}/api/v1/demo-lecturer/login`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({username:username.trim(),password}),cache:"no-store",signal:AbortSignal.timeout(10000),
    });
    if (upstream.status === 401) return NextResponse.json({error:"Tên đăng nhập hoặc mật khẩu không đúng."},{status:401,headers:noStore});
    if (!upstream.ok) return NextResponse.json({error:"Dịch vụ đăng nhập chưa sẵn sàng."},{status:503,headers:noStore});
    const data: unknown = await upstream.json();
    const token = data && typeof data === "object" ? (data as {access_token?:unknown}).access_token : undefined;
    if (typeof token !== "string" || token.length < 30) throw new Error("Invalid token");
    const response = NextResponse.json({ok:true},{headers:noStore});
    response.cookies.set(COOKIE,token,{httpOnly:true,secure:req.nextUrl.protocol==="https:",sameSite:"strict",path:"/",maxAge:28800});
    return response;
  } catch {
    return NextResponse.json({error:"Không kết nối được dịch vụ xác thực."},{status:503,headers:noStore});
  }
}
