import { NextResponse } from "next/server";
import { scanWatchlist } from "@/lib/elvoid/service";
import { insertSignals } from "@/lib/elvoid/signals";

export async function POST() {
  try {
    const generated = await scanWatchlist();
    const saved = await insertSignals(generated);
    if (saved.length) return NextResponse.json({ signals: saved, persisted: true });

    // Supabase not configured — return the freshly generated batch unsaved.
    return NextResponse.json({
      signals: generated.map((s, i) => ({
        ...s,
        extra_reasoning: s.extraReasoning,
        id: `local-${Date.now()}-${i}`,
        status: "new" as const,
        created_at: new Date().toISOString(),
      })),
      persisted: false,
    });
  } catch (err) {
    console.error("[ElVoid AI] scan error:", err);
    return NextResponse.json({ error: "Scan market gagal — coba lagi sebentar." }, { status: 500 });
  }
}
