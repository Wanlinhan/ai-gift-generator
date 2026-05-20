"use client";

import { Cpu, Download, ImageIcon, MonitorPlay, Settings2, Sparkles, WandSparkles, Zap } from "lucide-react";
import { useMemo, useState } from "react";

type ImageStatus = "READY" | "GENERATING" | "SUCCESS" | "FAIL";

const defaultPrompt =
  "画面中生成单个黑暗主题有关金色为点缀色调的物品，每次生成都和上一个不同，纯黑色背景，游戏道具，质感透亮，细腻，物品摆件，亮晶晶，二次元风格，1:1宽高比，正方形构图";

export default function Home() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [status, setStatus] = useState<ImageStatus>("READY");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const statusLabel = useMemo(() => {
    const labels: Record<ImageStatus, string> = {
      READY: "READY",
      GENERATING: "GENERATING",
      SUCCESS: "SUCCESS",
      FAIL: "FAIL"
    };

    return labels[status];
  }, [status]);

  async function handleGenerate() {
    setError("");
    setResultUrl(null);
    setStatus("GENERATING");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          size: "2048x2048",
          watermark: false
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "创建任务失败。");
      }

      if (!data.resultUrl) {
        throw new Error("AI 服务未返回可预览图片地址。");
      }

      setResultUrl(data.resultUrl);
      setCompletedCount((count) => count + 1);
      setStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成图片失败。");
      setStatus("FAIL");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="brand-mark">
          <ImageIcon size={42} strokeWidth={2.6} />
        </div>
        <h1>AI 图片礼物生成器</h1>
        <p>VOLCENGINE ARK | SEEDREAM 5.0 | 本地 Docker 可运行</p>
      </header>

      <section className="workspace" aria-label="AI 图片礼物生成工作区">
        <div className="left-column">
          <section className="panel control-panel">
            <div className="panel-title">
              <Settings2 size={22} />
              <h2>生成参数</h2>
            </div>

            <label className="field-label" htmlFor="prompt">
              提示词
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              spellCheck={false}
              className="prompt-input"
            />

            <div className="preset-row">
              <span>
                <Sparkles size={16} />
                1:1 方形构图
              </span>
              <span>
                <WandSparkles size={16} />
                Seedream 5.0
              </span>
            </div>

            <button className="generate-button" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <span className="spinner" /> : <Zap size={24} fill="currentColor" />}
              {isGenerating ? "处理中..." : "开始生成"}
            </button>

            {error ? <div className="error-box">{error}</div> : null}
          </section>

          <section className="stats-panel" aria-label="任务统计">
            <div>
              <strong className="blue">0</strong>
              <span>等待</span>
            </div>
            <div className="divider" />
            <div>
              <strong className={isGenerating ? "orange" : "muted"}>{isGenerating ? 1 : 0}</strong>
              <span>进行中</span>
            </div>
            <div className="divider" />
            <div>
              <strong className="green">{completedCount}</strong>
              <span>已完成</span>
            </div>
          </section>
        </div>

        <div className="right-column">
          <section className="panel status-panel">
            <div className="accent-bar" />
            <div className="panel-title compact">
              <Cpu size={22} />
              <h2>处理状态: {statusLabel}</h2>
            </div>
            <p>MODEL: doubao-seedream-5-0-260128</p>
          </section>

          <section className="panel preview-panel">
            <div className="preview-header">
              <h2>渲染预览</h2>
              {resultUrl ? (
                <a className="download-button" href={resultUrl} target="_blank" rel="noreferrer">
                  <Download size={16} />
                  打开图片
                </a>
              ) : null}
            </div>

            <div className="image-frame">
              {resultUrl ? (
                <img key={resultUrl} src={resultUrl} alt="AI 生成的礼物图片" />
              ) : (
                <div className="empty-state">
                  <MonitorPlay size={54} />
                  <span>{isGenerating ? "正在生成..." : "等待生成..."}</span>
                </div>
              )}

              {isGenerating ? (
                <div className="loading-cover">
                  <span className="spinner large" />
                  <p>正在生成高清图片...</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
