import { NextRequest, NextResponse } from "next/server";
import { buildReport, parseFilters } from "@/lib/report-core";
import { makeCsv, makeXlsx } from "@/lib/report-xlsx";

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get("format") ?? "csv";
    if (format !== "csv" && format !== "xlsx") return NextResponse.json({error:"Định dạng xuất không được hỗ trợ."},{status:400});
    const filters = parseFilters(request.nextUrl.searchParams);
    const report = await buildReport(filters); // Re-fetch authoritative data, never trust client rows.
    if (!report.rows.length) return NextResponse.json({error:"Không có dòng dữ liệu nào để xuất."},{status:422});
    const output = format === "xlsx" ? makeXlsx(report) : makeCsv(report);
    const ext = format === "xlsx" ? "xlsx" : "csv";
    const name = `eduinsight-${filters.type}-${new Date().toISOString().slice(0,10)}.${ext}`;
    return new NextResponse(new Uint8Array(output), { status:200, headers: {
      "Content-Type":format === "xlsx"?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"text/csv; charset=utf-8",
      "Content-Disposition":`attachment; filename="${name}"`,
      "Content-Length":String(output.length),
      "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff",
    }});
  } catch(e:unknown) {
    const badInput=e instanceof RangeError;
    console.error("Reports export:",e);
    return NextResponse.json({error:badInput?e.message:"Không thể xuất báo cáo. Kiểm tra FastAPI và dữ liệu."},{status:badInput?400:502});
  }
}
