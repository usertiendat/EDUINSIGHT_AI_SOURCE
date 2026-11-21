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
        await fetch(`${BACKEND}/api/v1/demo-auth/logout`, {
          method: "POST", headers: { Authorization: `Bearer ${existing}` }, cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
      } catch { /* Still clear browser cookie. */ }
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(COOKIE_NAME);
    return res;
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
