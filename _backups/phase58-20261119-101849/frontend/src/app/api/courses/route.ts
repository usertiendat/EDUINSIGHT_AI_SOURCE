import { NextResponse } from "next/server";

const API_BASE = process.env.FASTAPI_INTERNAL_URL ?? "http://127.0.0.1:8000";

export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/api/v1/analytics/courses`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`FastAPI HTTP ${response.status}`);
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("data" in body) || !Array.isArray(body.data)) {
      throw new Error("Invalid API response");
    }
    return NextResponse.json({ status: "success", data: body.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Course proxy error:", error);
    return NextResponse.json({ error: "Không thể tải dữ liệu học phần từ FastAPI." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
