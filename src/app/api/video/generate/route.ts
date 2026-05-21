import { NextResponse } from "next/server";
import { createArkVideoTask } from "@/src/lib/ark";
import { enforceCountLimit, parsePositiveCount } from "@/src/lib/count";
import { createGeneration, updateGeneration } from "@/src/lib/database";
import { inferVideoRatioFromPrompt } from "@/src/lib/prompt";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = String(body?.prompt || "");
    const count = parsePositiveCount(body?.count);
    const configuredLimit = Number(process.env.MAX_VIDEO_COUNT || 3);
    const limit = Number.isFinite(configuredLimit) ? configuredLimit : 3;
    const ratio =
      typeof body?.ratio === "string" && body.ratio.trim()
        ? body.ratio.trim()
        : inferVideoRatioFromPrompt(prompt);
    const generations = [];

    enforceCountLimit(count, limit, "视频");

    for (let index = 0; index < count; index += 1) {
      const generation = createGeneration({
        mode: "video",
        prompt,
        status: "QUEUED",
        ratio,
        model: process.env.ARK_VIDEO_MODEL || "doubao-seedance-2-0-260128"
      });

      if (!generation) {
        throw new Error("创建视频历史记录失败。");
      }

      try {
        const result = await createArkVideoTask({
          prompt,
          ratio,
          duration: Number(body?.duration || 5),
          generateAudio: body?.generateAudio !== false
        });
        generations.push(
          updateGeneration(generation.id, {
            status: "QUEUED",
            providerTaskId: result.taskId,
            ratio: result.ratio,
            model: result.model
          })
        );
      } catch (error) {
        generations.push(
          updateGeneration(generation.id, {
            status: "FAIL",
            error: error instanceof Error ? error.message : "创建视频任务失败。"
          })
        );
      }
    }

    const queued = generations.filter((generation) => generation?.providerTaskId);

    if (queued.length === 0) {
      return NextResponse.json(
        {
          error: generations.find((generation) => generation?.error)?.error || "创建视频任务失败。",
          generations
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      taskId: queued[0]?.providerTaskId,
      taskIds: queued.map((generation) => generation?.providerTaskId).filter(Boolean),
      status: "QUEUED",
      generations
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "创建视频任务失败。" },
      { status: 400 }
    );
  }
}
