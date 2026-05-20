export type ArkImageStatus = "READY" | "GENERATING" | "SUCCESS" | "FAIL";

export type GenerateRequest = {
  prompt: string;
  size?: string;
  watermark?: boolean;
};

export type GenerateResponse = {
  status: ArkImageStatus;
  resultUrl: string | null;
};

const DEFAULT_BASE_URL = "https://ark.cn-beijing.volces.com";
const DEFAULT_MODEL = "doubao-seedream-5-0-260128";

function getArkConfig() {
  const apiKey = process.env.ARK_API_KEY;

  if (!apiKey || apiKey === "your_volcengine_ark_api_key") {
    throw new Error("缺少 ARK_API_KEY，请先在 .env 中填写自己的火山引擎 Ark API Key。");
  }

  return {
    apiKey,
    baseUrl: process.env.ARK_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.ARK_MODEL || DEFAULT_MODEL
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
  const { apiKey, baseUrl, model } = getArkConfig();
  const prompt = input.prompt.trim();
  const payload: Record<string, unknown> = {
    model,
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
    resultUrl
  };
}

function extractResultUrl(data: any): string | null {
  return (
    data?.data?.[0]?.url ||
    data?.response_data?.image_url ||
    data?.response_data?.image_results?.[0]?.url ||
    data?.result_url ||
    data?.url ||
    null
  );
}
