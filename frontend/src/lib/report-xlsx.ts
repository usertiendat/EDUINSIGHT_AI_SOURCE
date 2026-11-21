/* Dependency-free XLSX (OOXML) writer; one read-only report worksheet. */
import { deflateRawSync } from "node:zlib";
import type { Report, Cell } from "./report-core";

const enc = (s: string) => Buffer.from(s, "utf8");
const xml = (s:string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
function crc32(data:Buffer):number {let crc=0xffffffff;for (const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function zip(entries:{name:string,data:string}[]):Buffer {
  const locals:Buffer[]=[], centrals:Buffer[]=[];
  let offset=0;
  for (const entry of entries) {
    const name=enc(entry.name), data=enc(entry.data), packed=deflateRawSync(data), crc=crc32(data);
    const lh=Buffer.alloc(30);lh.writeUInt32LE(0x04034b50,0);lh.writeUInt16LE(20,4);lh.writeUInt16LE(0,6);lh.writeUInt16LE(8,8);
    lh.writeUInt32LE(crc,14);lh.writeUInt32LE(packed.length,18);lh.writeUInt32LE(data.length,22);lh.writeUInt16LE(name.length,26);
    locals.push(lh,name,packed);
    const ch=Buffer.alloc(46);ch.writeUInt32LE(0x02014b50,0);ch.writeUInt16LE(20,4);ch.writeUInt16LE(20,6);ch.writeUInt16LE(8,10);
    ch.writeUInt32LE(crc,16);ch.writeUInt32LE(packed.length,20);ch.writeUInt32LE(data.length,24);ch.writeUInt16LE(name.length,28);ch.writeUInt32LE(offset,42);
    centrals.push(ch,name);offset+=lh.length+name.length+packed.length;
  }
  const central=Buffer.concat(centrals), end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);
  end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,central,end]);
}
function colName(idx:number):string {let s="";for(let i=idx+1;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;}
function spreadsheetCell(v:Cell, ref:string, style:number):string {
  if (v === null || v === undefined) return `<c r="${ref}" s="${style}"/>`;
  if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
  // Formula injection prevention even if imported to sheets with formula-like text.
  const safe = /^[\s]*[=+\-@\t\r]/.test(String(v)) ? `'${v}` : String(v);
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(safe)}</t></is></c>`;
}
function rowXml(values:Cell[], number:number, style:number) {return `<row r="${number}">${values.map((v,i)=>spreadsheetCell(v,`${colName(i)}${number}`,style)).join("")}</row>`;}
export function makeXlsx(report:Report):Buffer {
  const lastCol=colName(Math.max(0, report.columns.length-1));
  const rows:string[]=[];
  rows.push(rowXml([report.title],1,1));
  rows.push(rowXml([`Phạm vi: ${report.scope}`],2,0));
  rows.push(rowXml([`Thời điểm tạo: ${report.generatedAt}`],3,0));
  rows.push(rowXml([report.notice],4,0));
  rows.push(rowXml(report.columns.map(c=>c.label),6,1));
  report.rows.forEach((r,i)=>rows.push(rowXml(report.columns.map(c=>r[c.key]??null),i+7,0)));
  const freeze=`<pane ySplit="6" topLeftCell="A7" activePane="bottomLeft" state="frozen"/>`;
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastCol}${Math.max(6,report.rows.length+6)}"/><sheetViews><sheetView workbookViewId="0">${freeze}</sheetView></sheetViews><cols>${report.columns.map((c,i)=>`<col min="${i+1}" max="${i+1}" width="${Math.min(44,Math.max(16,c.label.length+5))}" customWidth="1"/>`).join("")}</cols><sheetData>${rows.join("")}</sheetData><autoFilter ref="A6:${lastCol}${Math.max(6,report.rows.length+6)}"/></worksheet>`;
  return zip([
    {name:"[Content_Types].xml",data:`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`},
    {name:"_rels/.rels",data:`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {name:"xl/workbook.xml",data:`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Báo cáo" sheetId="1" r:id="rId1"/></sheets></workbook>`},
    {name:"xl/_rels/workbook.xml.rels",data:`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name:"xl/styles.xml",data:`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`},
    {name:"xl/worksheets/sheet1.xml",data:sheet},
  ]);
}
export function makeCsv(report:Report):Buffer {
  const escape=(v:Cell)=>{
    const input=String(v??"");
    const safe=/^[\s]*[=+\-@\t\r]/.test(input)?`'${input}`:input;
    return `"${safe.replaceAll('"','""')}"`;
  };
  const lines=[...[[report.title],[`Phạm vi: ${report.scope}`],[report.notice],[],report.columns.map(c=>c.label)],
    ...report.rows.map(r=>report.columns.map(c=>r[c.key]??null))];
  return enc(`\uFEFF${lines.map(r=>r.map(escape).join(",")).join("\r\n")}\r\n`);
}
