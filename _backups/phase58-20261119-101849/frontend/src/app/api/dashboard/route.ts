import { NextResponse } from "next/server";


const API_BASE = process.env.FASTAPI_INTERNAL_URL ?? "http://127.0.0.1:8000";
const endpoints = ["overview", "departments", "semesters", "courses"] as const;

export async function GET() {
  try {
    const results = await Promise.all(
      endpoints.map(async (endpoint) => {
        const response = await fetch(`${API_BASE}/api/v1/analytics/${endpoint}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
        const json: unknown = await response.json();
        if (!json || typeof json !== "object" || !("data" in json)) {
          throw new Error(`${endpoint}: invalid response`);
        }
        return (json as { data: unknown }).data;
      }),
    );

    return NextResponse.json(
      {
        overview: results[0],
        departments: results[1],
        semesters: results[2],
        courses: results[3],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Dashboard data loading failed:", error);
    return NextResponse.json(
      { error: "Không kết nối được dữ liệu Analytics. Hãy kiểm tra FastAPI ở cổng 8000." },
      { status: 502 },
    );
  }
}
