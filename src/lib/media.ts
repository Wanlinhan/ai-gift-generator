import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

type MediaMode = "image" | "video";

const extensionByContentType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov"
};

function getUploadsRoot() {
  const configuredPath = process.env.UPLOADS_DIR || "./uploads";

  return path.isAbsolute(configuredPath) ? configuredPath : path.join(process.cwd(), configuredPath);
}

function inferExtension(url: string, contentType: string | null, mode: MediaMode) {
  if (contentType) {
    const extension = extensionByContentType[contentType.split(";")[0].trim().toLowerCase()];

    if (extension) {
      return extension;
    }
  }

  try {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname).replace(".", "").toLowerCase();

    if (extension) {
      return extension;
    }
  } catch {
    // Ignore invalid URL parsing here and fall back by mode.
  }

  return mode === "image" ? "png" : "mp4";
}

export async function saveRemoteMedia(url: string, mode: MediaMode) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`保存${mode === "image" ? "图片" : "视频"}失败：下载远程文件失败。`);
  }

  const contentType = response.headers.get("content-type");
  const extension = inferExtension(url, contentType, mode);
  const uploadsRoot = getUploadsRoot();
  const relativeDir = mode === "image" ? "images" : "videos";
  const targetDir = path.join(uploadsRoot, relativeDir);
  const filename = `${Date.now()}-${randomUUID()}.${extension}`;
  const absolutePath = path.join(targetDir, filename);

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  await writeFile(absolutePath, Buffer.from(await response.arrayBuffer()));

  return {
    absolutePath,
    publicUrl: `/generated/${relativeDir}/${filename}`
  };
}
