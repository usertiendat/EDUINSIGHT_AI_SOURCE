import { NextResponse } from "next/server";

const API_BASE = process.env.FASTAPI_INTERNAL_URL ?? "http://127.0.0.1:8000";

type Params = { params: Promise<{ studentCode: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { studentCode } = await params;
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(studentCode)) {
    return NextResponse.json({ error: "Mã sinh viên không hợp lệ." }, { status: 400 });
  }
  try {
    const response = await fetch(`${API_BASE}/api/v1/students/${encodeURIComponent(studentCode)}`, {
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    const data: unknown = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Student detail proxy failed", error);
    return NextResponse.json({ error: "Không thể kết nối FastAPI." }, { status: 502 });
  }
}
