import { NextResponse } from "next/server";
import { deleteGeneration, getGeneration } from "@/src/lib/database";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const generation = getGeneration(id);

    if (!generation) {
      return NextResponse.json({ error: "历史记录不存在。" }, { status: 404 });
    }

    return NextResponse.json({ generation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "读取历史记录失败。" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    deleteGeneration(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除历史记录失败。" },
      { status: 400 }
    );
  }
}
