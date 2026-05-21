export function parsePositiveCount(value: unknown, fallback = 1) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.floor(parsed));
}

export function enforceCountLimit(count: number, limit: number, label: string) {
  if (count > limit) {
    throw new Error(`${label}一次最多生成 ${limit} 个，请减少生成数量。`);
  }
}
