"use client";

import { Cpu, Download, ImageIcon, MonitorPlay, Settings2, Sparkles, Video, WandSparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type GenerationMode = "image" | "video";
type GenerationStatus = "READY" | "GENERATING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAIL";

const defaultPrompt =
  "画面中生成单个黑暗主题有关金色为点缀色调的物品，每次生成都和上一个不同，纯黑色背景，游戏道具，质感透亮，细腻，物品摆件，亮晶晶，二次元风格";

export default function Home() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [mode, setMode] = useState<GenerationMode>("image");
  const [status, setStatus] = useState<GenerationStatus>("READY");
  const [taskId, setTaskId] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const statusLabel = useMemo(() => {
    const labels: Record<GenerationStatus, string> = {
      READY: "READY",
      GENERATING: "GENERATING",
      QUEUED: "QUEUED",
      RUNNING: "RUNNING",
      SUCCESS: "SUCCESS",
      FAIL: "FAIL"
    };

    return labels[status];
  }, [status]);

  useEffect(() => {
    if (mode !== "video" || !taskId || !isGenerating) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/video/tasks/${encodeURIComponent(taskId)}`, {
          cache: "no-store"
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "查询视频任务失败。");
        }

        setStatus(data.status);

        if (data.status === "SUCCESS") {
          if (!data.resultUrl) {
            throw new Error("视频任务已成功，但 AI 服务未返回可预览地址。");
          }

          setResultUrl(data.resultUrl);
          setCompletedCount((count) => count + 1);
          setIsGenerating(false);
        }

        if (data.status === "FAIL") {
          throw new Error(data.error || "视频生成失败。");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "查询视频任务失败。");
        setStatus("FAIL");
        setIsGenerating(false);
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [mode, taskId, isGenerating]);

  function resetResult(nextMode: GenerationMode) {
    setMode(nextMode);
    setStatus("READY");
    setTaskId("");
    setResultUrl(null);
    setError("");
    setIsGenerating(false);
  }

  async function handleGenerate() {
    setError("");
    setResultUrl(null);
    setTaskId("");
    setStatus(mode === "image" ? "GENERATING" : "QUEUED");
    setIsGenerating(true);

    try {
      if (mode === "image") {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt,
            watermark: false
          })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "生成图片失败。");
        }

        if (!data.resultUrl) {
          throw new Error("AI 服务未返回可预览图片地址。");
        }

        setResultUrl(data.resultUrl);
        setCompletedCount((count) => count + 1);
        setStatus(data.status);
        setIsGenerating(false);
        return;
      }

      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          duration: 5,
          generateAudio: true
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "创建视频任务失败。");
      }

      if (!data.taskId) {
        throw new Error("AI 服务未返回视频任务 ID。");
      }

      setTaskId(data.taskId);
      setStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : mode === "image" ? "生成图片失败。" : "生成视频失败。");
      setStatus("FAIL");
      setIsGenerating(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="brand-mark">
          {mode === "image" ? <ImageIcon size={42} strokeWidth={2.6} /> : <Video size={42} strokeWidth={2.6} />}
        </div>
        <h1>AI 礼物生成器</h1>
        <p>VOLCENGINE ARK | SEEDREAM + SEEDANCE | 本地 Docker 可运行</p>
      </header>

      <section className="workspace" aria-label="AI 礼物生成工作区">
        <div className="left-column">
          <section className="panel control-panel">
            <div className="panel-title">
              <Settings2 size={22} />
              <h2>生成参数</h2>
            </div>

            <label className="field-label">生成类型</label>
            <div className="mode-switch" role="group" aria-label="选择生成类型">
              <button type="button" className={mode === "image" ? "active" : ""} onClick={() => resetResult("image")}>
                <ImageIcon size={17} />
                图片
              </button>
              <button type="button" className={mode === "video" ? "active" : ""} onClick={() => resetResult("video")}>
                <Video size={17} />
                视频
              </button>
            </div>

            <label className="field-label prompt-label" htmlFor="prompt">
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
                自动识别比例
              </span>
              <span>
                <WandSparkles size={16} />
                {mode === "image" ? "Seedream 5.0" : "Seedance 视频"}
              </span>
            </div>

            <button className="generate-button" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <span className="spinner" /> : <Zap size={24} fill="currentColor" />}
              {isGenerating ? "处理中..." : mode === "image" ? "生成图片" : "生成视频"}
            </button>

            {error ? <div className="error-box">{error}</div> : null}
          </section>

          <section className="stats-panel" aria-label="任务统计">
            <div>
              <strong className="blue">{mode === "video" && status === "QUEUED" ? 1 : 0}</strong>
              <span>等待</span>
            </div>
            <div className="divider" />
            <div>
              <strong className={isGenerating ? "orange" : "muted"}>
                {isGenerating && status !== "QUEUED" ? 1 : 0}
              </strong>
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
            <p>{mode === "image" ? "MODEL: ARK_IMAGE_MODEL" : `TASK_ID: ${taskId || "---"}`}</p>
          </section>

          <section className="panel preview-panel">
            <div className="preview-header">
              <h2>渲染预览</h2>
              {resultUrl ? (
                <a className="download-button" href={resultUrl} target="_blank" rel="noreferrer">
                  <Download size={16} />
                  {mode === "image" ? "打开图片" : "打开视频"}
                </a>
              ) : null}
            </div>

            <div className="image-frame">
              {resultUrl && mode === "image" ? (
                <img key={resultUrl} src={resultUrl} alt="AI 生成的礼物图片" />
              ) : null}
              {resultUrl && mode === "video" ? (
                <video key={resultUrl} src={resultUrl} controls autoPlay loop playsInline />
              ) : null}
              {!resultUrl ? (
                <div className="empty-state">
                  <MonitorPlay size={54} />
                  <span>{isGenerating ? "正在生成..." : "等待生成..."}</span>
                </div>
              ) : null}

              {isGenerating ? (
                <div className="loading-cover">
                  <span className="spinner large" />
                  <p>{mode === "image" ? "正在生成高清图片..." : "正在生成视频..."}</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
