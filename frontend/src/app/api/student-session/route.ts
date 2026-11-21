import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.EDUINSIGHT_BACKEND_URL || "http://127.0.0.1:8000";
const COOKIE_NAME = "eduinsight_demo_session";

function permittedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.nextUrl.host &&
      new URL(origin).protocol === req.nextUrl.protocol;
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  if (!permittedOrigin(req)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({error:"Dữ liệu không hợp lệ."}, {status:400});
  if (body.action === "logout") {
    const existing = req.cookies.get(COOKIE_NAME)?.value;
    if (existing) {
      try {
        const result = await fetch(`${BACKEND}/api/v1/demo-auth/logout`, {
          method:"POST", headers:{ Authorization:`Bearer ${existing}` }, cache:"no-store",
          signal:AbortSignal.timeout(8000),
        });
        // An expired/invalid session is already unusable; any other error must
        // not be presented as a successfully revoked server-side session.
        if (!result.ok && result.status !== 401) {
          return NextResponse.json({error:"Chưa xác nhận được việc thu hồi phiên. Vui lòng thử lại."},{status:503});
        }
      } catch {
        return NextResponse.json({error:"Không kết nối được máy chủ để đăng xuất an toàn."},{status:503});
      }
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(COOKIE_NAME);
    res.headers.set("Cache-Control","no-store");
    return res;
  }
  if (body.action === "change-password") {
    if (typeof body.current_password !== "string" ||
        typeof body.new_password !== "string" ||
        body.current_password.length < 1 || body.current_password.length > 256 ||
        body.new_password.length < 12 || body.new_password.length > 128) {
      return NextResponse.json({error:"Mật khẩu mới phải có từ 12 đến 128 ký tự."},{status:400});
    }
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({error:"Phiên đăng nhập không hợp lệ."},{status:401});
    try {
      const upstream = await fetch(`${BACKEND}/api/v1/demo-auth/change-password`, {
        method:"POST", headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({current_password:body.current_password,new_password:body.new_password}),
        cache:"no-store", signal:AbortSignal.timeout(10000),
      });
      if (upstream.ok) {
        const res = NextResponse.json({ok:true,message:"Đổi mật khẩu thành công. Vui lòng đăng nhập lại."});
        res.cookies.delete(COOKIE_NAME);
        res.headers.set("Cache-Control","no-store");
        return res;
      }
      if (upstream.status === 401) {
        const res = NextResponse.json({error:"Phiên đăng nhập hết hạn."},{status:401});
        res.cookies.delete(COOKIE_NAME);
        return res;
      }
      const messages:Record<number,string> = {400:"Mật khẩu hiện tại không đúng hoặc mật khẩu mới không hợp lệ.",403:"Không có quyền thực hiện thao tác.",429:"Tài khoản tạm khóa. Vui lòng thử lại sau."};
      return NextResponse.json({error:messages[upstream.status] || "Không thể đổi mật khẩu."}, {status:messages[upstream.status]?upstream.status:502});
    } catch {
      return NextResponse.json({error:"Không thể kết nối dịch vụ xác thực."},{status:503});
    }
  }
  if (body.action !== "login" || typeof body.username !== "string" || typeof body.password !== "string" ||
      body.username.length > 80 || body.password.length > 256) {
    return NextResponse.json({error:"Dữ liệu đăng nhập không hợp lệ."}, {status:400});
  }
  try {
    const backend = await fetch(`${BACKEND}/api/v1/demo-auth/login`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ username: body.username, password: body.password }),
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!backend.ok) return NextResponse.json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." }, { status: 401 });
    const result = await backend.json();
    if (typeof result.access_token !== "string") throw Error("Backend response invalid");
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, result.access_token, {
      httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "strict", path: "/",
      maxAge: Math.min(Number(result.expires_in) || 28800, 28800),
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Không kết nối được dịch vụ đăng nhập." }, { status: 503 });
  }
}
