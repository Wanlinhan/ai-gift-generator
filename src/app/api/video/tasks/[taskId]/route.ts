import { NextResponse } from "next/server";
import { queryArkVideoTask } from "@/src/lib/ark";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { taskId } = await context.params;
    const result = await queryArkVideoTask(taskId);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "查询视频任务失败。" },
      { status: 400 }
    );
  }
}
