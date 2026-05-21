export type ArkGenerationStatus = "READY" | "GENERATING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAIL";

export type GenerateRequest = {
  prompt: string;
  size?: string;
  watermark?: boolean;
};

export type GenerateResponse = {
  status: ArkGenerationStatus;
  resultUrl: string | null;
  model?: string;
  size?: string;
};

export type VideoGenerateRequest = {
  prompt: string;
  ratio?: string;
  duration?: number;
  generateAudio?: boolean;
};

export type VideoGenerateResponse = {
  taskId: string;
  status: ArkGenerationStatus;
  model?: string;
  ratio?: string;
};

export type VideoTaskResponse = {
  taskId: string;
  status: ArkGenerationStatus;
  resultUrl: string | null;
  error?: string;
};

const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com";
const DEFAULT_IMAGE_MODEL = "doubao-seedream-5-0-260128";
const DEFAULT_VIDEO_MODEL = "doubao-seedance-2-0-260128";

function getArkConfig() {
  const apiKey = process.env.ARK_API_KEY;

  if (!apiKey || apiKey === "your_volcengine_ark_api_key") {
    throw new Error("缺少 ARK_API_KEY，请先在 .env 中填写自己的火山引擎 Ark API Key。");
  }

  return {
    apiKey,
    baseUrl: process.env.ARK_BASE_URL || DEFAULT_BASE_URL,
    imageModel: process.env.ARK_IMAGE_MODEL || process.env.ARK_MODEL || DEFAULT_IMAGE_MODEL,
    videoModel: process.env.ARK_VIDEO_MODEL || DEFAULT_VIDEO_MODEL
  };
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`AI 服务返回了非 JSON 内容：${text.slice(0, 160)}`);
  }
}

export async function createArkImage(input: GenerateRequest): Promise<GenerateResponse> {
  const { apiKey, baseUrl, imageModel } = getArkConfig();
  const prompt = input.prompt.trim();
  const payload: Record<string, unknown> = {
    model: imageModel,
    prompt,
    response_format: "url",
    watermark: input.watermark ?? false
  };

  if (!prompt) {
    throw new Error("请输入图片礼物生成提示词。");
  }

  if (input.size) {
    payload.size = input.size;
  }

  const response = await fetch(`${baseUrl}/api/v3/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || data?.error?.message || "生成图片失败。");
  }

  const resultUrl = extractResultUrl(data);

  if (!resultUrl) {
    throw new Error("AI 服务未返回图片地址。");
  }

  return {
    status: "SUCCESS",
    resultUrl,
    model: imageModel,
    size: input.size
  };
}

function extractResultUrl(data: any): string | null {
  return (
    data?.data?.[0]?.url ||
    data?.content?.video_url ||
    data?.content?.url ||
    data?.response_data?.image_url ||
    data?.response_data?.image_results?.[0]?.url ||
    data?.response_data?.video_results?.[0]?.url ||
    data?.response_data?.video_url ||
    data?.result_url ||
    data?.video_url ||
    data?.url ||
    null
  );
}

export async function createArkVideoTask(input: VideoGenerateRequest): Promise<VideoGenerateResponse> {
  const { apiKey, baseUrl, videoModel } = getArkConfig();
  const prompt = input.prompt.trim();

  if (!prompt) {
    throw new Error("请输入视频礼物生成提示词。");
  }

  const payload: Record<string, unknown> = {
    model: videoModel,
    content: [{ type: "text", text: prompt }],
    duration: input.duration || 5,
    generate_audio: input.generateAudio ?? true
  };

  if (input.ratio) {
    payload.ratio = input.ratio;
  }

  const response = await fetch(`${baseUrl}/api/v3/contents/generations/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || data?.error?.message || "创建视频生成任务失败。");
  }

  const taskId = data?.id || data?.task_id;

  if (!taskId) {
    throw new Error("AI 服务未返回视频任务 ID。");
  }

  return {
    taskId,
    status: "QUEUED",
    model: videoModel,
    ratio: input.ratio
  };
}

function normalizeVideoStatus(status: unknown): ArkGenerationStatus {
  const value = String(status || "").toLowerCase();

  if (value === "success" || value === "succeeded" || value === "completed") {
    return "SUCCESS";
  }

  if (value === "fail" || value === "failed" || value === "error" || value === "cancelled" || value === "expired") {
    return "FAIL";
  }

  if (value === "queued" || value === "pending") {
    return "QUEUED";
  }

  return "RUNNING";
}

export async function queryArkVideoTask(taskId: string): Promise<VideoTaskResponse> {
  const { apiKey, baseUrl } = getArkConfig();

  if (!taskId) {
    throw new Error("缺少视频任务 ID。");
  }

  const response = await fetch(`${baseUrl}/api/v3/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    cache: "no-store"
  });

  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.message || data?.error?.message || "查询视频任务失败。");
  }

  const status = normalizeVideoStatus(data?.status);

  return {
    taskId,
    status,
    resultUrl: extractResultUrl(data),
    error: status === "FAIL" ? data?.error?.message || data?.reason || data?.message || "视频生成失败。" : undefined
  };
}
