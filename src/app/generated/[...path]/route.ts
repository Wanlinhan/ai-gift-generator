import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

const contentTypes: Record<string, string> = {
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".webm": "video/webm",
  ".webp": "image/webp"
};

function getUploadsRoot() {
  const configuredPath = process.env.UPLOADS_DIR || "./uploads";

  return path.isAbsolute(configuredPath) ? configuredPath : path.join(process.cwd(), configuredPath);
}

export async function GET(_request: Request, context: RouteContext) {
  const { path: segments } = await context.params;
  const uploadsRoot = getUploadsRoot();
  const requestedPath = path.normalize(path.join(uploadsRoot, ...segments));

  if (!requestedPath.startsWith(uploadsRoot) || !existsSync(requestedPath)) {
    return NextResponse.json({ error: "文件不存在。" }, { status: 404 });
  }

  const body = await readFile(requestedPath);
  const extension = path.extname(requestedPath).toLowerCase();

  return new Response(body, {
    headers: {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
