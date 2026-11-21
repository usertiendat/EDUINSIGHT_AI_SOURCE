import { NextResponse } from "next/server";

const API_BASE = process.env.FASTAPI_INTERNAL_URL ?? "http://127.0.0.1:8000";

export async function GET() {
  try {
    const endpoints = ["departments", "courses"] as const;
    const [departments, courses] = await Promise.all(endpoints.map(async (endpoint) => {
      const response = await fetch(`${API_BASE}/api/v1/analytics/${endpoint}`, {
        cache: "no-store", signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("data" in payload) || !Array.isArray(payload.data)) {
        throw new Error(`${endpoint}: invalid payload`);
      }
      return payload.data;
    }));
    return NextResponse.json({ departments, courses }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Department API proxy failed:", error);
    return NextResponse.json({ error: "Không tải được dữ liệu khoa từ FastAPI." }, {
      status: 502, headers: { "Cache-Control": "no-store" },
    });
  }
}
