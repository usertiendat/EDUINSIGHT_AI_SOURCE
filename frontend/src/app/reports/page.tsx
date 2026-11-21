"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpen, Building2, CalendarRange, CheckCircle2, Download, FileSpreadsheet, FileText, FilterX, Printer, RefreshCw, Search, ShieldCheck } from "lucide-react";
import AppShell from "@/components/layout/app-shell";
import type { Report, ReportType } from "@/lib/report-core";
import "./reports.css";

type RequestFilters = { type: ReportType; department:string; year:string; semester:string; q:string };
const initial:RequestFilters = {type:"overview",department:"all",year:"all",semester:"all",q:""};
const tabs = [
  {type:"overview" as const, label:"Tổng quan", icon:BarChart3, description:"Chỉ số đào tạo toàn trường"},
  {type:"departments" as const,label:"Theo khoa",icon:Building2,description:"Cơ cấu và quy mô các khoa"},
  {type:"courses" as const,label:"Học phần",icon:BookOpen,description:"Kết quả theo học phần"},
  {type:"semesters" as const,label:"Học kỳ",icon:CalendarRange,description:"So sánh các học kỳ"},
];
function urlFor(filters:RequestFilters, exportFormat?:"csv"|"xlsx") {
  const p=new URLSearchParams({type:filters.type});
  if (filters.department!=="all") p.set("department",filters.department);
  if (filters.year!=="all") p.set("year",filters.year);
  if (filters.semester!=="all") p.set("semester",filters.semester);
  if (filters.q.trim()) p.set("q",filters.q.trim());
  if (exportFormat) p.set("format",exportFormat);
  return `/api/reports${exportFormat?"/export":""}?${p.toString()}`;
}
function errorMessage(data:unknown) {
  return !!data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Không tải được báo cáo từ hệ thống.";
}
function display(v:string|number|null) {return v===null?"—":typeof v==="number"?v.toLocaleString("vi-VN",{maximumFractionDigits:2}):v;}
function normalize(value:unknown):Report {
  if (!value || typeof value!=="object") throw Error("Phản hồi báo cáo không hợp lệ.");
  const report=value as Report;
  if (!Array.isArray(report.columns)||!Array.isArray(report.rows)||!Array.isArray(report.totals)||typeof report.title!=="string") throw Error("Cấu trúc báo cáo không hợp lệ.");
  return report;
}

export default function ReportsPage(){
  const [filters,setFilters]=useState<RequestFilters>(initial);
  const [query,setQuery]=useState("");
  const [refresh,setRefresh]=useState(0);
  const [report,setReport]=useState<Report|null>(null);
  const [options,setOptions]=useState<Report|null>(null);
  const [loading,setLoading]=useState(true);
  const [exporting,setExporting]=useState<"csv"|"xlsx"|null>(null);
  const [error,setError]=useState("");
  const [exportError,setExportError]=useState("");
  const [page,setPage]=useState(1);
  const type=filters.type;

  useEffect(()=>{
    const controller=new AbortController();
    // Base report is used solely for valid filter options; never fake cross-dimension joins.
    if(type!=="courses" && type!=="semesters") {setOptions(null);return ()=>controller.abort();}
    const base={...initial,type};
    fetch(urlFor(base),{signal:controller.signal,cache:"no-store"}).then(async r=>{
      const data:unknown=await r.json();if(!r.ok)throw Error(errorMessage(data));return normalize(data);
    }).then(data=>{if(!controller.signal.aborted)setOptions(data);}).catch(()=>{if(!controller.signal.aborted)setOptions(null);});
    return ()=>controller.abort();
  },[type,refresh]);

  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError("");setPage(1);
    const timer=setTimeout(()=>{
      fetch(urlFor({...filters,q:query}),{signal:controller.signal,cache:"no-store"}).then(async r=>{
        const data:unknown=await r.json();if(!r.ok)throw Error(errorMessage(data));return normalize(data);
      }).then(data=>{if(!controller.signal.aborted){setReport(data);setError("");}})
        .catch(e=>{if(!controller.signal.aborted){setReport(null);setError(e instanceof Error?e.message:"Không thể tải dữ liệu.");}})
        .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },query?280:0);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[filters,query,refresh]);

  const [departmentOptions,setDepartmentOptions]=useState<{code:string;name:string}[]>([]);
  useEffect(()=>{
    if(type!=="courses"){setDepartmentOptions([]);return;}
    const controller=new AbortController();
    fetch("/api/courses",{cache:"no-store",signal:controller.signal}).then(async response=>{
      if(!response.ok)throw Error("API học phần không khả dụng.");return response.json();
    }).then((payload:unknown)=>{
      if(!payload||typeof payload!=="object"||!("data" in payload)||!Array.isArray(payload.data))return;
      const map=new Map<string,string>();
      for(const r of payload.data){if(r&&typeof r==="object"&&typeof r.department_code==="string"&&typeof r.department_name==="string")map.set(r.department_code,r.department_name);}
      if(!controller.signal.aborted)setDepartmentOptions([...map].map(([code,name])=>({code,name})).sort((a,b)=>a.name.localeCompare(b.name,"vi")));
    }).catch(()=>{if(!controller.signal.aborted)setDepartmentOptions([]);});
    return ()=>controller.abort();
  },[type,refresh]);
  const years=useMemo(()=>[...new Set((options?.rows??[]).map(r=>String(r.academic_year??"")).filter(Boolean))].sort(),[options]);
  const semesters=useMemo(()=>[...new Set((options?.rows??[]).filter(r=>filters.year==="all"||r.academic_year===filters.year).map(r=>String(r.semester_code??"")).filter(Boolean))].sort(),[options,filters.year]);
  const totalPages=Math.max(1,Math.ceil((report?.rows.length??0)/12));
  const visibleRows=(report?.rows??[]).slice((page-1)*12,page*12);
  const hasRows=!!report?.rows.length && !loading && !error;
  const changeType=(next:ReportType)=>{setFilters({...initial,type:next});setQuery("");setOptions(null);setExportError("");setPage(1);};
  const exportFile=async(format:"csv"|"xlsx")=>{
    setExporting(format);setExportError("");
    try{
      const response=await fetch(urlFor({...filters,q:query},format),{cache:"no-store"});
      if(!response.ok){const data:unknown=await response.json().catch(()=>null);throw Error(errorMessage(data));}
      const blob=await response.blob();
      const cd=response.headers.get("Content-Disposition")??"";
      const match=/filename="([a-zA-Z0-9_.-]+)"/.exec(cd);
      const filename=match?.[1]??`eduinsight-${type}.${format}`;
      const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=filename;
      document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(e:unknown){setExportError(e instanceof Error?e.message:"Xuất báo cáo thất bại.");}
    finally{setExporting(null);}
  };
  return <AppShell>
    <main className="dashboard-content rpt-page">
      <header className="rpt-head"><div><p className="eyebrow">EDUINSIGHT AI / TRUNG TÂM BÁO CÁO</p><h1>Trung tâm báo cáo <span className="rpt-star">✦</span></h1><p className="page-subtitle">Tổng hợp dữ liệu đào tạo có thể kiểm chứng, xem trước và xuất báo cáo.</p></div>
        <button className="outline-button" onClick={()=>setRefresh(v=>v+1)} disabled={loading} type="button"><RefreshCw size={16}/> Làm mới</button></header>
      <section className="rpt-types" aria-label="Loại báo cáo">{tabs.map(({type:tabType,label,description,icon:Icon})=><button key={tabType} type="button" aria-pressed={type===tabType} className={`rpt-type ${type===tabType?"is-active":""}`} onClick={()=>changeType(tabType)}><Icon size={21}/><span><strong>{label}</strong><small>{description}</small></span></button>)}</section>
      <section className="panel rpt-filter" aria-label="Bộ lọc báo cáo"><div className="rpt-section-heading"><h2><Search size={17}/> Tùy chọn báo cáo</h2><span>Chỉ hiển thị bộ lọc được API hỗ trợ</span></div>
        <div className="rpt-filter-row">
          {(type==="courses"||type==="departments"||type==="semesters")&&<label className="rpt-field rpt-search"><span>Tìm kiếm</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={type==="courses"?"Mã hoặc tên học phần...":type==="departments"?"Tên hoặc mã khoa...":"Mã học kỳ hoặc năm học..."}/></label>}
          {type==="courses"&&<label className="rpt-field"><span>Khoa quản lý</span><select value={filters.department} onChange={e=>setFilters(f=>({...f,department:e.target.value}))}><option value="all">Tất cả khoa</option>{departmentOptions.map(d=><option key={d.code} value={d.code}>{d.name}</option>)}</select></label>}
          {type==="semesters"&&<><label className="rpt-field"><span>Năm học</span><select value={filters.year} onChange={e=>setFilters(f=>({...f,year:e.target.value,semester:"all"}))}><option value="all">Tất cả năm học</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label><label className="rpt-field"><span>Học kỳ</span><select value={filters.semester} onChange={e=>setFilters(f=>({...f,semester:e.target.value}))}><option value="all">Tất cả học kỳ</option>{semesters.map(s=><option key={s} value={s}>{s}</option>)}</select></label></>}
          {type==="overview"&&<p className="rpt-filter-note">Báo cáo tổng quan áp dụng cho toàn bộ dữ liệu. Chỉ số không thể lọc theo khoa hoặc học kỳ từ API hiện tại.</p>}
          {type!=="overview"&&<button type="button" className="rpt-clear" onClick={()=>{setFilters({...initial,type});setQuery("");}}><FilterX size={15}/> Xóa bộ lọc</button>}
        </div>
      </section>
      {(error||exportError)&&<div className="error-alert rpt-alert" role="alert"><span>{error||exportError}</span>{error&&<button type="button" onClick={()=>setRefresh(v=>v+1)}>Thử lại</button>}</div>}
      <section className="panel rpt-preview" aria-label="Xem trước báo cáo"><div className="rpt-preview-head"><div><h2><FileText size={19}/> {report?.title??tabs.find(t=>t.type===type)?.label}</h2><p>{report?.description??"Tải dữ liệu thống kê..."}</p></div>
        <div className="rpt-actions"><button className="outline-button" disabled={!hasRows||!!exporting} onClick={()=>void exportFile("csv")} type="button"><Download size={15}/> CSV</button><button className="outline-button" disabled={!hasRows||!!exporting} onClick={()=>void exportFile("xlsx")} type="button"><FileSpreadsheet size={15}/> Excel</button><button className="primary-button" disabled={!hasRows||!!exporting} onClick={()=>window.print()} type="button"><Printer size={15}/> In / Lưu PDF</button></div></div>
        {loading?<div className="rpt-loading" role="status"><RefreshCw size={17} className="rpt-spin"/> Đang tổng hợp dữ liệu từ FastAPI...</div>:!error&&report&&<>
          <div className="rpt-report-paper"><div className="rpt-paper-heading"><span>HỌC VIỆN HÀNG KHÔNG VIỆT NAM · EDUINSIGHT AI</span><h2>{report.title}</h2><p><strong>Phạm vi:</strong> {report.scope}</p><p><strong>Thời gian tạo:</strong> {new Date(report.generatedAt).toLocaleString("vi-VN",{hour12:false})}</p></div>
            <div className="rpt-kpis">{report.totals.map(k=><div key={k.label}><small>{k.label}</small><strong>{k.value}</strong></div>)}<div><small>Số dòng dữ liệu</small><strong>{report.rows.length.toLocaleString("vi-VN")}</strong></div></div>
            {report.rows.length?<div className="rpt-table-wrap"><table className="course-table rpt-table"><thead><tr>{report.columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{visibleRows.map((r,index)=><tr key={`${page}-${index}`}>{report.columns.map(c=><td key={c.key} title={String(r[c.key]??"")}>{display(r[c.key]??null)}</td>)}</tr>)}</tbody></table></div>:<div className="rpt-empty">Không có bản ghi phù hợp với bộ lọc. Không thể xuất báo cáo trống.</div>}
            {report.rows.length>12&&<div className="rpt-print-all"><table><thead><tr>{report.columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{report.rows.map((r,i)=><tr key={i}>{report.columns.map(c=><td key={c.key}>{display(r[c.key]??null)}</td>)}</tr>)}</tbody></table></div>}
            <div className="rpt-footer"><ShieldCheck size={16}/>{report.notice}</div>
          </div>
          {report.rows.length>12&&<div className="rpt-pagination"><span>Hiển thị {(page-1)*12+1}–{Math.min(page*12,report.rows.length)} / {report.rows.length} dòng</span><div><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} type="button">Trước</button><span>Trang {page}/{totalPages}</span><button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} type="button">Sau</button></div></div>}
        </>}
      </section>
      <p className="rpt-caveat"><CheckCircle2 size={16}/> Báo cáo tổng quan không được cộng từ số sinh viên của các học kỳ; số sinh viên học phần cũng không cộng thành tổng sinh viên toàn trường. Báo cáo PDF sử dụng chức năng In / Lưu PDF của trình duyệt.</p>
    </main>
  </AppShell>;
}
