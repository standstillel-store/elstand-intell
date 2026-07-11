import { NextResponse } from "next/server";
import { generateAnalysis, type AnalystContext } from "@/lib/analyst";

interface ChatBody {
  message: string;
  context?: Partial<AnalystContext>;
}

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody;

  const ctx: AnalystContext = {
    markets: body.context?.markets ?? [],
    pumpCandidates: body.context?.pumpCandidates ?? [],
    rugpullRisks: body.context?.rugpullRisks ?? [],
    funding: body.context?.funding ?? [],
    whales: body.context?.whales ?? [],
    news: body.context?.news ?? [],
    fearGreed: body.context?.fearGreed,
  };

  try {
    const reply = generateAnalysis(body.message, ctx);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[Noctrun] analyst error:", err);
    return NextResponse.json({
      reply: "Ada kendala saat memproses analisis. Coba tanyakan lagi dengan ticker yang lebih spesifik.",
    });
  }
}
