import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { getDB } from '@/lib/db';
import type { Email, EmailChat } from '@/types/index';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const emailId = parseInt(id);
    const { message } = (await request.json()) as { message: string };

    const db = getDB();

    const email = db
      .prepare('SELECT * FROM emails WHERE id = ?')
      .get(emailId) as Email | undefined;
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    const history = db
      .prepare('SELECT * FROM email_chats WHERE email_id = ? ORDER BY id ASC')
      .all(emailId) as EmailChat[];

    // Save user message
    db.prepare(
      "INSERT INTO email_chats (email_id, role, content, is_draft) VALUES (?, 'user', ?, 0)",
    ).run(emailId, message);

    const historyText = history
      .map((h) => `[${h.role === 'user' ? '사용자' : 'AI'}]\n${h.content}`)
      .join('\n\n---\n\n');

    const prompt = `당신은 이메일 답신 어시스턴트입니다. 아래 수신 이메일을 분석하고 사용자 요청에 따라 답신 초안을 작성하거나 조언을 제공하세요.

수신 이메일:
제목: ${email.subject}
발신자: ${email.sender_name ?? ''} <${email.sender_email ?? ''}>
날짜: ${email.received_at}
내용:
${email.body ?? ''}${historyText ? `\n\n이전 대화:\n${historyText}` : ''}

사용자 요청: ${message}

답신 초안 요청 시 이메일 형식(인사말, 본문, 서명)으로 작성하되 VIBE MAFIA CLUB 최수민 명의로 작성하세요.`;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const child = spawn('claude', ['-p', prompt]);
        let fullContent = '';

        child.stdout.on('data', (data: Buffer) => {
          const chunk = data.toString();
          fullContent += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
        });

        child.on('close', () => {
          const result = db
            .prepare(
              "INSERT INTO email_chats (email_id, role, content, is_draft) VALUES (?, 'assistant', ?, 1)",
            )
            .run(emailId, fullContent);
          const chatId = result.lastInsertRowid;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, chat_id: chatId })}\n\n`),
          );
          controller.close();
        });

        child.on('error', (err: Error) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`),
          );
          controller.close();
        });
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
