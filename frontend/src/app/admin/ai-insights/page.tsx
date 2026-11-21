'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ArrowUp, BookOpenCheck, BrainCircuit, CheckCircle2, ChevronRight,
  CircleAlert, ClipboardList, Database, GraduationCap, History, LockKeyhole,
  MessageSquareText, Plus, ShieldCheck, UserRound, WandSparkles,
} from 'lucide-react';
import AppShell from '@/components/layout/app-shell';
import './ai-insights.css';

type Evidence = { source: string; label: string };
type Result = { answer: string; mode: 'openai_intent' | 'rules'; topic: string; outcome?: 'answered' | 'needs_clarification' | 'unsupported' | 'no_data'; evidence: Evidence[]; suggestions: string[]; data_scope?: string };
type Turn = { id: number; question: string; result: Result };

const STARTERS = [
  { icon: GraduationCap, title: 'Quy mô đào tạo', text: 'Tổng quan dữ liệu đào tạo hiện tại' },
  { icon: BookOpenCheck, title: 'Kết quả học tập', text: 'Khoa nào có điểm đánh giá trung bình thấp nhất?' },
  { icon: ClipboardList, title: 'Chuyên cần', text: 'Tỷ lệ chuyên cần hiện tại là bao nhiêu?' },
  { icon: Database, title: 'So sánh khoa', text: 'So sánh quy mô sinh viên theo khoa' },
];

export default function AiInsightsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState('');
  const [name, setName] = useState('Quản trị viên');
  const [selected, setSelected] = useState<'all' | 'sources'>('all');
  const [feedback, setFeedback] = useState<Record<number, 'yes' | 'no'>>({});
  const bottom = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const counter = useRef(0);

  useEffect(() => {
    let alive = true;
    fetch('/api/admin-session/me', { cache: 'no-store' })
      .then(async response => {
        if (response.status === 401 || response.status === 403) { router.replace('/login'); return null; }
        if (!response.ok) throw new Error('Không thể xác minh phiên quản trị.');
        return response.json();
      })
      .then(body => {
        if (!alive || !body) return;
        if (body.data?.role !== 'admin') { router.replace('/login'); return; }
        setAuthorized(true);
        if (typeof body.data?.display_name === 'string') setName(body.data.display_name);
      })
      .catch(err => { if (alive) setError(err instanceof Error ? err.message : 'Không thể xác minh phiên.'); })
      .finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, [router]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns, busy]);

  async function ask(value: string) {
    const text = value.trim();
    if (!authorized || busy || text.length < 5 || text.length > 500) return;
    setBusy(true);
    setError('');
    setQuestion('');
    try {
      const response = await fetch('/api/admin-session/ai-insights', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, history: turns.slice(-3).map(turn => turn.question) }), cache: 'no-store',
      });
      if (response.status === 401 || response.status === 403) { router.replace('/login'); return; }
      const body = await response.json();
      if (!response.ok || typeof body?.data?.answer !== 'string') {
        throw new Error(typeof body?.error === 'string' ? body.error : 'Trợ lý chưa thể trả lời câu hỏi này.');
      }
      counter.current += 1;
      setTurns(previous => [...previous, { id: counter.current, question: text, result: body.data as Result }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi khi xử lý yêu cầu.');
      setQuestion(text);
    } finally { setBusy(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void ask(question); }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault(); void ask(question);
    }
  }
  function newChat() { if (busy) return; setTurns([]); setFeedback({}); setQuestion(''); setError(''); field.current?.focus(); }

  return <AppShell>
    <main className="ai-pro" aria-label="Không gian trò chuyện EduInsight AI">
      <div className="ai-pro-header">
        <div className="ai-pro-crumb"><Link href="/admin/dashboard">Quản trị</Link><ChevronRight size={14}/><span>Trợ lý AI</span></div>
        <div className="ai-pro-identity"><span className="ai-pro-orb"><BrainCircuit size={22}/></span><div><p className="ai-pro-eyebrow">EDUINSIGHT AI / ASSISTANT</p><h1>Trợ lý phân tích giáo dục</h1><p>Trò chuyện với dữ liệu, hiểu rõ kết quả và xu hướng đào tạo.</p></div></div>
        <div className="ai-pro-status"><span className="ai-pro-dot"/>Chế độ truy vấn có kiểm chứng <span className="ai-pro-divider">·</span> Admin</div>
      </div>

      <div className="ai-pro-workspace">
        <aside className="ai-pro-rail" aria-label="Công cụ hội thoại">
          <button className="ai-pro-new" type="button" onClick={newChat} disabled={!authorized || busy}><Plus size={17}/>Cuộc trò chuyện mới</button>
          <div className="ai-pro-rail-section"><span className="ai-pro-raillabel">KHÔNG GIAN HIỆN TẠI</span><div className="ai-pro-railcurrent"><MessageSquareText size={17}/><span>Phân tích đào tạo</span><span className="ai-pro-active-dot"/></div><p>Hội thoại trong phiên trang hiện tại. Chưa lưu lịch sử lên máy chủ.</p></div>
          <div className="ai-pro-rail-section"><span className="ai-pro-raillabel">CHỦ ĐỀ HỖ TRỢ</span><div className="ai-pro-rail-topics"><span>Quy mô đào tạo</span><span>Điểm đánh giá theo khoa</span><span>Chuyên cần</span><span>Bài tập</span><span>So sánh học kỳ</span></div></div>
          <div className="ai-pro-railbottom"><ShieldCheck size={18}/><div><strong>Phân quyền tại máy chủ</strong><span>Chỉ dữ liệu Warehouse tổng hợp được phép xem.</span></div></div>
        </aside>

        <section className="ai-pro-dialogue" aria-label="Nội dung hội thoại">
          <div className="ai-pro-chatheader"><div className="ai-pro-avatar"><BrainCircuit size={19}/></div><div><strong>EduInsight AI Assistant</strong><span>Xin chào, {name} · Kho dữ liệu mô phỏng</span></div><span className="ai-pro-readonly"><LockKeyhole size={14}/> Chỉ đọc</span></div>
          <div className="ai-pro-scroll" role="log" aria-live="polite" aria-relevant="additions">
            {checking ? <div className="ai-pro-center">Đang xác minh phiên quản trị...</div> : !authorized ?
              <div className="ai-pro-center">Không thể mở trợ lý khi chưa xác minh tài khoản Admin.</div> : turns.length === 0 ?
              <div className="ai-pro-welcome"><span className="ai-pro-welcomeicon"><WandSparkles size={28}/></span><span className="ai-pro-kicker">TRỢ LÝ DỮ LIỆU GIÁO DỤC</span><h2>Bạn muốn khám phá điều gì hôm nay?</h2><p>Hỏi về dữ liệu đào tạo bằng tiếng Việt. Mọi số liệu đều được lấy từ các thống kê có quyền truy cập.</p><div className="ai-pro-starters">{STARTERS.map(({icon: Icon,title,text}) => <button type="button" key={title} disabled={busy} onClick={() => void ask(text)}><Icon size={20}/><strong>{title}</strong><small>{text}</small><ArrowRight className="ai-pro-arrow" size={17}/></button>)}</div></div> :
              <div className="ai-pro-messages">{turns.map(turn => <div key={turn.id} className="ai-pro-exchange"><div className="ai-pro-userline"><div className="ai-pro-userbubble">{turn.question}</div><span className="ai-pro-useravatar"><UserRound size={16}/></span></div><div className="ai-pro-assistantline"><span className="ai-pro-mini"><BrainCircuit size={17}/></span><div className="ai-pro-answer"><div className="ai-pro-answer-meta"><strong>EduInsight AI</strong><span>{turn.result.mode === 'openai_intent' ? 'OpenAI hỗ trợ nhận diện ý hỏi · Số liệu đã đối chiếu' : 'Truy vấn có kiểm chứng'}</span></div><p>{turn.result.answer}</p>{turn.result.evidence?.length > 0 && <div className="ai-pro-evidence"><Database size={15}/><strong>Nguồn:</strong>{turn.result.evidence.map(source => <span key={source.source} title={source.source}>{source.label}</span>)}</div>}<div className="ai62-feedback"><span>Câu trả lời này đã đáp ứng điều bạn muốn biết chưa?</span><div className="ai62-feedback-actions"><button type="button" className={feedback[turn.id] === 'yes' ? 'ai62-selected' : ''} aria-pressed={feedback[turn.id] === 'yes'} onClick={() => setFeedback(prev => ({...prev, [turn.id]: 'yes'}))}>Có, đã rõ</button><button type="button" className={feedback[turn.id] === 'no' ? 'ai62-selected' : ''} aria-pressed={feedback[turn.id] === 'no'} onClick={() => { setFeedback(prev => ({...prev, [turn.id]: 'no'})); field.current?.focus(); }}>Chưa đúng ý</button></div>{feedback[turn.id] === 'no' && <p className="ai62-feedback-hint">Bạn có thể nói rõ chỉ số, khoa hoặc học kỳ cần xem; tôi sẽ kiểm tra lại theo đúng phạm vi đó.</p>}{feedback[turn.id] === 'yes' && <p className="ai62-feedback-hint">Đã ghi nhận đánh giá trong phiên này. Cảm ơn bạn.</p>}</div></div></div></div>)}
              </div>}
            {busy && <div className="ai-pro-busy" role="status"><span className="ai-pro-pulse"/><span>Đang đối chiếu số liệu và tạo câu trả lời...</span></div>}
            <div ref={bottom}/>
          </div>
          <div className="ai-pro-compose-wrap">{error && <div className="ai-pro-error" role="alert"><CircleAlert size={17}/>{error}</div>}
            <form onSubmit={submit} className="ai-pro-compose"><label className="ai-pro-sr" htmlFor="ai-pro-question">Đặt câu hỏi cho trợ lý AI</label><textarea ref={field} id="ai-pro-question" rows={2} maxLength={500} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={keyDown} disabled={!authorized || busy} placeholder="Nhập câu hỏi về điểm, chuyên cần, khoa hoặc học kỳ..."/><button type="submit" disabled={!authorized || busy || question.trim().length < 5} aria-label="Gửi câu hỏi"><ArrowUp size={20}/></button></form><div className="ai-pro-compose-foot"><span>Enter để gửi · Shift + Enter xuống dòng</span><span>{question.length}/500</span></div><p className="ai-pro-privacy">Không nhập dữ liệu cá nhân hoặc bí mật. Trợ lý chỉ trả lời khi có nguồn dữ liệu đúng phạm vi.</p></div>
        </section>

        <aside className="ai-pro-context" aria-label="Nguồn và giới hạn phân tích">
          <div className="ai-pro-contexthead"><Database size={18}/><h2>Thông tin phân tích</h2></div>
          <div className="ai-pro-tabs"><button type="button" aria-pressed={selected === 'all'} onClick={() => setSelected('all')} className={selected === 'all' ? 'ai-pro-tab-active' : ''}>Phạm vi</button><button type="button" aria-pressed={selected === 'sources'} onClick={() => setSelected('sources')} className={selected === 'sources' ? 'ai-pro-tab-active' : ''}>Nguồn dữ liệu</button></div>
          {selected === 'all' ? <div className="ai-pro-contextbody"><div className="ai-pro-contextrow"><CheckCircle2 size={18}/><div><strong>Đúng vai trò</strong><p>Phiên Admin được kiểm tra ở FastAPI trước khi đọc số liệu.</p></div></div><div className="ai-pro-contextrow"><CheckCircle2 size={18}/><div><strong>Chỉ đọc dữ liệu</strong><p>Không sửa điểm, chuyên cần hay tài khoản qua cuộc trò chuyện.</p></div></div><div className="ai-pro-contextrow"><CircleAlert size={18}/><div><strong>Giới hạn hiện tại</strong><p>Hỗ trợ câu hỏi tiếp nối ngắn trong phiên chat. Chưa có lịch sử lưu trên máy chủ; không hỗ trợ mọi kiểu câu hỏi.</p></div></div></div> : <div className="ai-pro-contextbody"><p className="ai-pro-contextintro">Các câu trả lời thống kê sử dụng API Warehouse đã có:</p><div className="ai-pro-source"><Database size={15}/><span>Tổng quan Warehouse</span></div><div className="ai-pro-source"><Database size={15}/><span>Thống kê theo khoa</span></div><div className="ai-pro-source"><Database size={15}/><span>Thống kê theo học kỳ</span></div></div>}
          <div className="ai-pro-contextfoot"><History size={17}/><p>Cuộc trò chuyện không được lưu vĩnh viễn. Đóng hoặc tải lại trang sẽ bắt đầu phiên mới.</p></div>
        </aside>
      </div>
      <div className="ai-pro-bottom"><span>DỮ LIỆU MÔ PHỎNG · KHÔNG PHẢI KẾT QUẢ ĐÀO TẠO CHÍNH THỨC CỦA VAA</span><Link href="/admin/dashboard">Quay về Dashboard <ArrowRight size={14}/></Link></div>
    </main>
  </AppShell>;
}
