import { NextResponse } from "next/server";
import { createArkImage } from "@/src/lib/ark";
import { inferImageSizeFromPrompt } from "@/src/lib/prompt";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = String(body?.prompt || "");
    const result = await createArkImage({
      prompt,
      size:
        typeof body?.size === "string" && body.size.trim()
          ? body.size.trim()
          : inferImageSizeFromPrompt(prompt),
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
