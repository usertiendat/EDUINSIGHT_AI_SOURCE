import { NextRequest, NextResponse } from "next/server";
import { buildReport, parseFilters } from "@/lib/report-core";

export async function GET(request: NextRequest) {
  try {
    const report = await buildReport(parseFilters(request.nextUrl.searchParams));
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
  } catch (e: unknown) {
    const badInput = e instanceof RangeError;
    console.error("Reports API:", e);
    return NextResponse.json({ error: badInput ? e.message : "Không thể tải báo cáo. Kiểm tra FastAPI và định dạng dữ liệu." }, {
      status: badInput ? 400 : 502, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  }
}
