import { NextResponse } from "next/server";
import { listGenerations } from "@/src/lib/database";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 80);

    return NextResponse.json({ generations: listGenerations(limit) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取历史记录失败。" },
      { status: 400 }
    );
  }
}
