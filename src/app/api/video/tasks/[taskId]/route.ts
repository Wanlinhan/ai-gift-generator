import { NextResponse } from "next/server";
import { queryArkVideoTask } from "@/src/lib/ark";
import { updateGenerationByTaskId } from "@/src/lib/database";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { taskId } = await context.params;
    const result = await queryArkVideoTask(taskId);
    const generation = updateGenerationByTaskId(taskId, {
      status: result.status === "SUCCESS" || result.status === "FAIL" ? result.status : "RUNNING",
      resultUrl: result.resultUrl,
      error: result.error
    });

    return NextResponse.json({ ...result, generation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询视频任务失败。" },
      { status: 400 }
    );
  }
}
