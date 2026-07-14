import { NextResponse } from "next/server";
import { getSnapshot } from "@/lib/snapshot";
import { routeMessage } from "@/lib/analysis";

interface ChatBody {
  message: string;
}

// ELSTAND INTELLIGENCE's chat dock (ElVoid AI) used to proxy every question to the
// OpenAI API, which costs real money per request. It now runs entirely on
// ElVoid AI's own rule-based Intelligence Engine (lib/analysis.ts): live data
// in, structured signal interpretation out — no LLM call, no API key, no
// cost, ever.
export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ reply: "Pesan tidak valid." }, { status: 400 });
  }

  const message = (body.message ?? "").toString().slice(0, 500);
  if (!message.trim()) {
    return NextResponse.json({ reply: 'Tanya sesuatu dulu — misalnya "analisa BTC" atau "whale activity".' });
  }

  try {
    const snapshot = await getSnapshot();
    const reply = routeMessage(message, snapshot);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[ElVoid AI] chat engine error:", err);
    return NextResponse.json({
      reply: "Data live sedang tidak bisa diambil sebentar — coba lagi dalam beberapa detik.",
    });
  }
}
