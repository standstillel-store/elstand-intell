import { NextResponse } from "next/server";
import { getWallet, getDefaultWallet, updateWalletSettings } from "@/lib/elvoid/paperTrader";

export async function GET() {
  const wallet = await getWallet();
  return NextResponse.json({ wallet: wallet ?? getDefaultWallet(), configured: Boolean(wallet) });
}

export async function PATCH(req: Request) {
  let body: { riskPercent?: number };
  try {
    body = (await req.json()) as { riskPercent?: number };
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  if (typeof body.riskPercent !== "number" || Number.isNaN(body.riskPercent)) {
    return NextResponse.json({ error: "riskPercent wajib diisi dengan angka." }, { status: 400 });
  }
  const result = await updateWalletSettings(body.riskPercent);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
