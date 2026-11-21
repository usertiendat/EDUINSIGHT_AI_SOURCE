import {adminAuthorization} from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.FASTAPI_INTERNAL_URL ?? "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  const adminAuth=adminAuthorization(request);
  if (!adminAuth) return NextResponse.json({error:"Cần đăng nhập quản trị viên."},{status:401});
  const params = request.nextUrl.searchParams;
  const isFilters = params.get("view") === "filters";
  const allowed = ["q", "department_key", "program_key", "status", "page", "page_size"];
  const query = new URLSearchParams();
  for (const key of allowed) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  const endpoint = isFilters ? "filters" : `?${query.toString()}`;
  try {
    const response = await fetch(`${API_BASE}/api/v1/students${isFilters ? "/" : ""}${endpoint}`, {
      headers: {Authorization:adminAuth}, cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const data: unknown = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Student list proxy failed", error);
    return NextResponse.json({ error: "Không thể kết nối FastAPI. Kiểm tra server ở cổng 8000." }, { status: 502 });
  }
}
