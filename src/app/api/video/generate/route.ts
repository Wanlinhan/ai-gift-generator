import { NextResponse } from "next/server";
import { createArkVideoTask } from "@/src/lib/ark";
import { inferVideoRatioFromPrompt } from "@/src/lib/prompt";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = String(body?.prompt || "");
    const result = await createArkVideoTask({
      prompt,
      ratio:
        typeof body?.ratio === "string" && body.ratio.trim()
          ? body.ratio.trim()
          : inferVideoRatioFromPrompt(prompt),
      duration: Number(body?.duration || 5),
      generateAudio: body?.generateAudio !== false
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建视频任务失败。" },
      { status: 400 }
    );
  }
}
