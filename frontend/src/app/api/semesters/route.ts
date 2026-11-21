import type {NextRequest} from "next/server";
import {adminAuthorization} from "@/lib/admin-auth";
import { NextResponse } from "next/server";

const API_BASE = process.env.FASTAPI_INTERNAL_URL ?? "http://127.0.0.1:8000";

export async function GET(request: NextRequest) {
  const adminAuth=adminAuthorization(request);
  if (!adminAuth) return NextResponse.json({error:"Cần đăng nhập quản trị viên."},{status:401});
  try {
    const response = await fetch(`${API_BASE}/api/v1/analytics/semesters`, {
      headers: {Authorization:adminAuth}, cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json: unknown = await response.json();
    if (!json || typeof json !== "object" || !("data" in json) || !Array.isArray(json.data)) {
      throw new Error("Phản hồi API không có danh sách học kỳ.");
    }
    return NextResponse.json({ semesters: json.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Semester API proxy failed:", error);
    return NextResponse.json({ error: "Không tải được dữ liệu học kỳ từ FastAPI. Kiểm tra backend ở cổng 8000." }, {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
