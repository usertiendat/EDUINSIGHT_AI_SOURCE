import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_BACKEND, adminAuthorization, sameOrigin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Yêu cầu khác nguồn không được phép.' }, { status: 403, headers });
  const auth = adminAuthorization(req);
  if (!auth) return NextResponse.json({ error: 'Cần đăng nhập quản trị viên.' }, { status: 401, headers });
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'Yêu cầu JSON không hợp lệ.' }, { status: 415, headers });
  }
  const raw = await req.text();
  if (raw.length > 4200) return NextResponse.json({ error: 'Yêu cầu quá dài.' }, { status: 413, headers });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'JSON không hợp lệ.' }, { status: 400, headers }); }
  if (!body || typeof body !== 'object' || !('question' in body)) {
    return NextResponse.json({ error: 'Thiếu câu hỏi.' }, { status: 422, headers });
  }
  const input = body as { question?: unknown; history?: unknown };
  if (typeof input.question !== 'string' || input.question.trim().length < 5 || input.question.length > 500) {
    return NextResponse.json({ error: 'Câu hỏi phải dài từ 5 đến 500 ký tự.' }, { status: 422, headers });
  }
  const history = input.history ?? [];
  if (!Array.isArray(history) || history.length > 3 || history.some(item => typeof item !== 'string' || item.length > 500)) {
    return NextResponse.json({ error: 'Lịch sử hội thoại không hợp lệ.' }, { status: 422, headers });
  }
  try {
    const upstream = await fetch(`${ADMIN_BACKEND}/api/v1/ai-insights/query`, {
      method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: input.question.trim(), history }), cache: 'no-store',
      signal: AbortSignal.timeout(120000),
    });
    if (upstream.status === 401 || upstream.status === 403) {
      return NextResponse.json({ error: 'Phiên Admin không hợp lệ hoặc không được cấp quyền.' }, { status: upstream.status, headers });
    }
    if (!upstream.ok) return NextResponse.json({ error: 'Trợ lý chưa thể xử lý yêu cầu.' }, { status: upstream.status === 422 ? 422 : 502, headers });
    return NextResponse.json(await upstream.json(), { headers });
  } catch {
    return NextResponse.json({ error: 'Không kết nối được máy chủ AI Insights.' }, { status: 503, headers });
  }
}
