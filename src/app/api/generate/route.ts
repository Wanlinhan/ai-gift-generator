import { NextResponse } from "next/server";
import { createArkImage } from "@/src/lib/ark";
import { enforceCountLimit, parsePositiveCount } from "@/src/lib/count";
import { createGeneration, updateGeneration } from "@/src/lib/database";
import { saveRemoteMedia } from "@/src/lib/media";
import { inferImageSizeFromPrompt } from "@/src/lib/prompt";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = String(body?.prompt || "");
    const count = parsePositiveCount(body?.count);
    const configuredLimit = Number(process.env.MAX_IMAGE_COUNT || 10);
    const limit = Number.isFinite(configuredLimit) ? configuredLimit : 10;
    const size =
      typeof body?.size === "string" && body.size.trim()
        ? body.size.trim()
        : inferImageSizeFromPrompt(prompt);
    const generations = [];

    enforceCountLimit(count, limit, "图片");

    for (let index = 0; index < count; index += 1) {
      const generation = createGeneration({
        mode: "image",
        prompt,
        status: "GENERATING",
        size,
        model: process.env.ARK_IMAGE_MODEL || process.env.ARK_MODEL || "doubao-seedream-5-0-260128"
      });

      if (!generation) {
        throw new Error("创建图片历史记录失败。");
      }

      try {
        const result = await createArkImage({
          prompt,
          size,
          watermark: body?.watermark === true
        });
        const savedMedia = result.resultUrl ? await saveRemoteMedia(result.resultUrl, "image") : null;
        generations.push(
          updateGeneration(generation.id, {
            status: "SUCCESS",
            resultUrl: savedMedia?.publicUrl || result.resultUrl,
            remoteUrl: result.resultUrl,
            localPath: savedMedia?.absolutePath,
            size: result.size,
            model: result.model
          })
        );
      } catch (error) {
        generations.push(
          updateGeneration(generation.id, {
            status: "FAIL",
            error: error instanceof Error ? error.message : "生成图片失败。"
          })
        );
      }
    }

    const successful = generations.filter((generation) => generation?.status === "SUCCESS");

    if (successful.length === 0) {
      return NextResponse.json(
        {
          error: generations.find((generation) => generation?.error)?.error || "生成图片失败。",
          generations
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: "SUCCESS",
      resultUrl: successful[0]?.resultUrl || null,
      generations
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成图片失败。" },
      { status: 400 }
    );
  }
}
