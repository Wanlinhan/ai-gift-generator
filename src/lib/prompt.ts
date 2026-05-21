const aspectSizeMap = {
  square: "2048x2048",
  landscapeWide: "2560x1440",
  portraitWide: "1440x2560",
  landscapeClassic: "2304x1728",
  portraitClassic: "1728x2304"
} as const;

const videoRatioMap = {
  square: "1:1",
  landscapeWide: "16:9",
  portraitWide: "9:16",
  landscapeClassic: "4:3",
  portraitClassic: "3:4"
} as const;

type AspectKey = keyof typeof aspectSizeMap;

function inferAspectKey(prompt: string): AspectKey | undefined {
  const text = prompt.toLowerCase();

  if (/16\s*[:：]\s*9/.test(text) || /横图|横版|横向|宽屏|电影感|电影画幅/.test(text)) {
    return "landscapeWide";
  }

  if (/9\s*[:：]\s*16/.test(text) || /竖图|竖版|竖向|手机壁纸|手机海报|短视频封面/.test(text)) {
    return "portraitWide";
  }

  if (/4\s*[:：]\s*3/.test(text)) {
    return "landscapeClassic";
  }

  if (/3\s*[:：]\s*4/.test(text) || /竖版海报|竖构图/.test(text)) {
    return "portraitClassic";
  }

  if (/1\s*[:：]\s*1/.test(text) || /方图|正方形|方形|头像/.test(text)) {
    return "square";
  }

  return undefined;
}

export function inferImageSizeFromPrompt(prompt: string): string | undefined {
  const aspect = inferAspectKey(prompt);

  return aspect ? aspectSizeMap[aspect] : undefined;
}

export function inferVideoRatioFromPrompt(prompt: string): string | undefined {
  const aspect = inferAspectKey(prompt);

  return aspect ? videoRatioMap[aspect] : undefined;
}
