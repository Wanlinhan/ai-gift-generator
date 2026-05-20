import { NextResponse } from "next/server";
import { createArkImage } from "@/src/lib/ark";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createArkImage({
      prompt: String(body?.prompt || ""),
      size: String(body?.size || "2048x2048"),
      watermark: body?.watermark === true
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成图片失败。" },
      { status: 400 }
    );
  }
}
