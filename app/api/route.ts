import { NextResponse } from "next/server";

interface ChatBody {
  message: string;
  context?: Record<string, unknown>;
}

function fallbackAnswer(): string {
  return "OpenAI API key belum terhubung. Tambahkan OPENAI_API_KEY di Vercel → Settings → Environment Variables, lalu Redeploy.";
}

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ reply: fallbackAnswer() });
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini"; // gpt-4o-mini paling hemat

  const systemPrompt = `You are Noctrun AI, a crypto market-intelligence assistant embedded in a dark terminal-style dashboard.
You are given a live JSON snapshot of current signals: pump candidates, rugpull risk scores, whale activity, funding rates, and fear & greed index.
Answer the user's question using ONLY that data — do not hallucinate prices or events outside the snapshot.
Be concise, direct, and use plain language. Always make clear these are data-driven signals, not predictions.
Nothing you say is financial advice.`;

  const userContent = `Live market snapshot:\n${JSON.stringify(body.context ?? {}).slice(0, 6000)}\n\nUser question: ${body.message}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[Noctrun] OpenAI error ${res.status}:`, errBody);
      return NextResponse.json({ reply: fallbackAnswer() });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ reply: text || fallbackAnswer() });
  } catch {
    return NextResponse.json({ reply: fallbackAnswer(body.context) });
  }
}
