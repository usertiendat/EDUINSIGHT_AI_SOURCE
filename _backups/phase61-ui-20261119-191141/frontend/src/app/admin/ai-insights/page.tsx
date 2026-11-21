'use client';
import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUp, BrainCircuit, Database, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import './ai-insights.css';

type Evidence={source:string;label:string};
type Result={answer:string;mode:'openai'|'rules';topic:string;evidence:Evidence[];suggestions:string[]};
type Turn={question:string;result:Result};
const INITIAL=[
 'Tổng quan dữ liệu đào tạo hiện tại',
 'Tỷ lệ chuyên cần hiện tại là bao nhiêu?',
 'Điểm đánh giá trung bình hiện tại?',
 'So sánh quy mô sinh viên theo khoa',
 'So sánh các học kỳ',
 'Tỷ lệ nộp bài là bao nhiêu?',
];
export default function AiInsightsPage(){
 const router=useRouter();
 const [authorized,setAuthorized]=useState(false);
 const [loading,setLoading]=useState(true);
 const [question,setQuestion]=useState('');
 const [busy,setBusy]=useState(false);
 const [turns,setTurns]=useState<Turn[]>([]);
 const [error,setError]=useState('');
 useEffect(()=>{
  let alive=true;
  fetch('/api/admin-session/me',{cache:'no-store'})
   .then(r=>{if(r.status===401||r.status===403){router.replace('/login');return null;}if(!r.ok)throw new Error();return r.json();})
   .then(b=>{if(!alive)return;if(b?.data?.role==='admin'){setAuthorized(true);}else if(b){router.replace('/login');}})
   .catch(()=>{if(alive)setError('Không xác minh được phiên Admin. Hãy kiểm tra kết nối.');})
   .finally(()=>{if(alive)setLoading(false);});
  return ()=>{alive=false;};
 },[router]);
 async function ask(value:string){
  const text=value.trim();
  if(!authorized||busy||text.length<5||text.length>500)return;
  setBusy(true);setError('');setQuestion('');
  try{
   const response=await fetch('/api/admin-session/ai-insights',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:text}),cache:'no-store'
   });
   if(response.status===401||response.status===403){router.replace('/login');return;}
   const body=await response.json();
   if(!response.ok||!body?.data?.answer)throw new Error(body?.error||'Không thể phân tích câu hỏi.');
   setTurns(prev=>[...prev.slice(-9),{question:text,result:body.data as Result}]);
  }catch(e){setError(e instanceof Error?e.message:'Có lỗi khi xử lý yêu cầu.');setQuestion(text);}
  finally{setBusy(false);}
 }
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();void ask(question);}
 return <main className="ai61-page"><div className="ai61-shell">
  <header className="ai61-top"><Link href="/admin/dashboard"><ArrowLeft size={17}/> Quay về Dashboard</Link><span><ShieldCheck size={16}/> Chỉ dành cho Admin</span></header>
  <section className="ai61-hero"><div className="ai61-symbol"><BrainCircuit size={28}/></div><div><span className="ai61-eyebrow">EDUINSIGHT AI · PHASE 6.1</span><h1>Trợ lý phân tích dữ liệu</h1><p>Đặt câu hỏi và nhận diễn giải dựa trên dữ liệu tổng hợp Warehouse mô phỏng.</p></div></section>
  <div className="ai61-columns"><section className="ai61-chat" aria-label="Hội thoại phân tích">
   {loading?<div className="ai61-empty">Đang kiểm tra phiên quản trị...</div>:
    !authorized?<div className="ai61-empty">Không thể mở trợ lý trước khi xác thực Admin.</div>:
    <><div className="ai61-history" aria-live="polite">
    {turns.length===0?<div className="ai61-welcome"><Sparkles size={25}/><h2>Hôm nay bạn muốn phân tích điều gì?</h2><p>Chọn một câu hỏi gợi ý hoặc nhập câu hỏi liên quan đến chỉ số đào tạo.</p><div className="ai61-pills">{INITIAL.map(s=><button key={s} type="button" onClick={()=>void ask(s)} disabled={busy}>{s}</button>)}</div></div>:
    turns.map((turn,i)=><article className="ai61-turn" key={i}><div className="ai61-question">{turn.question}</div><div className="ai61-answer"><div className="ai61-answerhead"><BrainCircuit size={17}/><strong>EduInsight Insights</strong><span>{turn.result.mode==='openai'?'Diễn giải bằng AI':'Phân tích theo quy tắc'}</span></div><p>{turn.result.answer}</p>{turn.result.evidence?.length>0&&<div className="ai61-evidence"><Database size={15}/>{turn.result.evidence.map(e=><span key={e.source}>{e.label}</span>)}</div>}</div></article>)}
    {busy&&<div className="ai61-thinking">Đang đọc chỉ số tổng hợp và phân tích...</div>}
    </div><form className="ai61-form" onSubmit={submit}><label htmlFor="ai61-question">Câu hỏi phân tích</label><div className="ai61-entry"><textarea id="ai61-question" rows={2} maxLength={500} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ví dụ: Tỷ lệ chuyên cần toàn trường hiện là bao nhiêu?" disabled={busy} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void ask(question);}}}/><button type="submit" aria-label="Gửi câu hỏi" disabled={busy||question.trim().length<5}><ArrowUp size={20}/></button></div><small>Không nhập dữ liệu cá nhân, mật khẩu hay thông tin nhạy cảm.</small></form></>}
   {error&&<p className="ai61-error" role="alert">{error}</p>}
  </section><aside className="ai61-side"><div className="ai61-box"><h2><LockKeyhole size={18}/> Phạm vi dữ liệu</h2><p>Chỉ đọc thống kê tổng hợp từ Warehouse mô phỏng. Không truy cập hồ sơ sinh viên, danh sách tài khoản hay nhập SQL tùy ý.</p></div><div className="ai61-box"><h2><Database size={18}/> Nguồn kiểm chứng</h2><p>Mọi trả lời hỗ trợ đều gắn nhãn nguồn dữ liệu như tổng quan, khoa hoặc học kỳ. Giá trị chỉ cập nhật khi thực hiện câu hỏi mới.</p></div><div className="ai61-box"><h2><Sparkles size={18}/> Chế độ xử lý</h2><p>Nếu OpenAI API chưa được bật, hệ thống trả kết luận theo quy tắc. Khi bật API, chỉ dữ liệu thống kê tổng hợp được gửi tới nhà cung cấp AI bên ngoài; không gửi nguyên văn câu hỏi.</p></div><p className="ai61-disclaimer">Dữ liệu minh họa, không phải số liệu chính thức của Học viện Hàng không Việt Nam. Kết quả không thay thế đánh giá học thuật.</p></aside></div>
 </div></main>;
}
