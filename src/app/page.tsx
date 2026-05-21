"use client";

import { Cpu, Download, ImageIcon, MonitorPlay, Settings2, Sparkles, Trash2, Video, WandSparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type GenerationMode = "image" | "video";
type GenerationStatus = "READY" | "GENERATING" | "QUEUED" | "RUNNING" | "SUCCESS" | "FAIL";

type GenerationRecord = {
  id: string;
  mode: GenerationMode;
  prompt: string;
  status: GenerationStatus;
  resultUrl: string | null;
  providerTaskId: string | null;
  error: string | null;
  size: string | null;
  ratio: string | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
};

const defaultPrompt =
  "画面中生成单个黑暗主题有关金色为点缀色调的物品，每次生成都和上一个不同，纯黑色背景，游戏道具，质感透亮，细腻，物品摆件，亮晶晶，二次元风格";

export default function Home() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [mode, setMode] = useState<GenerationMode>("image");
  const [count, setCount] = useState(1);
  const [status, setStatus] = useState<GenerationStatus>("READY");
  const [taskId, setTaskId] = useState("");
  const [activeVideoTaskIds, setActiveVideoTaskIds] = useState<string[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GenerationRecord[]>([]);

  const maxCount = mode === "image" ? 10 : 3;

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

  const stats = useMemo(() => {
    return {
      queued: history.filter((item) => item.status === "QUEUED").length,
      running: history.filter((item) => item.status === "GENERATING" || item.status === "RUNNING").length,
      completed: history.filter((item) => item.status === "SUCCESS").length
    };
  }, [history]);

  useEffect(() => {
    refreshHistory();
  }, []);

  useEffect(() => {
    if (count > maxCount) {
      setCount(maxCount);
    }
  }, [count, maxCount]);

  useEffect(() => {
    if (activeVideoTaskIds.length === 0) {
      return;
    }

    const timer = window.setInterval(async () => {
      const pending: string[] = [];

      try {
        const results = await Promise.all(
          activeVideoTaskIds.map(async (id) => {
            const response = await fetch(`/api/video/tasks/${encodeURIComponent(id)}`, {
              cache: "no-store"
            });
            const data = await response.json();

            if (!response.ok) {
              throw new Error(data?.error || "查询视频任务失败。");
            }

            return data;
          })
        );

        for (const item of results) {
          if (item.status === "SUCCESS" && item.resultUrl && !resultUrl) {
            setResultUrl(item.resultUrl);
          }

          if (item.status !== "SUCCESS" && item.status !== "FAIL") {
            pending.push(item.taskId);
          }
        }

        setActiveVideoTaskIds(pending);
        setStatus(pending.length > 0 ? "RUNNING" : "SUCCESS");
        setIsGenerating(pending.length > 0);
        await refreshHistory();
      } catch (err) {
        setError(err instanceof Error ? err.message : "查询视频任务失败。");
        setStatus("FAIL");
        setIsGenerating(false);
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [activeVideoTaskIds, resultUrl]);

  async function refreshHistory() {
    const response = await fetch("/api/generations", {
      cache: "no-store"
    });
    const data = await response.json();

    if (response.ok) {
      setHistory(data.generations || []);
    }
  }

  function resetResult(nextMode: GenerationMode) {
    setMode(nextMode);
    setStatus("READY");
    setTaskId("");
    setActiveVideoTaskIds([]);
    setResultUrl(null);
    setError("");
    setIsGenerating(false);
  }

  function updateCount(value: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      setCount(1);
      return;
    }

    setCount(Math.max(1, Math.min(maxCount, Math.floor(parsed))));
  }

  async function handleGenerate() {
    setError("");
    setResultUrl(null);
    setTaskId("");
    setActiveVideoTaskIds([]);
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
            count,
            watermark: false
          })
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "生成图片失败。");
        }

        const firstResult = data.generations?.find((item: GenerationRecord) => item.resultUrl)?.resultUrl || data.resultUrl;

        if (!firstResult) {
          throw new Error("AI 服务未返回可预览图片地址。");
        }

        setResultUrl(firstResult);
        setStatus(data.status);
        setIsGenerating(false);
        await refreshHistory();
        return;
      }

      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          count,
          duration: 5,
          generateAudio: true
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "创建视频任务失败。");
      }

      const taskIds = Array.isArray(data.taskIds) ? data.taskIds.filter(Boolean) : data.taskId ? [data.taskId] : [];

      if (taskIds.length === 0) {
        throw new Error("AI 服务未返回视频任务 ID。");
      }

      setTaskId(taskIds[0]);
      setActiveVideoTaskIds(taskIds);
      setStatus(data.status);
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : mode === "image" ? "生成图片失败。" : "生成视频失败。");
      setStatus("FAIL");
      setIsGenerating(false);
      await refreshHistory();
    }
  }

  async function deleteHistory(id: string) {
    await fetch(`/api/generations/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    await refreshHistory();
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

            <div className="count-row">
              <label className="field-label" htmlFor="count">
                生成数量
              </label>
              <input
                id="count"
                type="number"
                min={1}
                max={maxCount}
                value={count}
                onChange={(event) => updateCount(event.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div className="preset-row">
              <span>
                <Sparkles size={16} />
                自动识别比例
              </span>
              <span>
                <WandSparkles size={16} />
                {mode === "image" ? "图片最多 10 个" : "视频最多 3 个"}
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
              <strong className="blue">{stats.queued}</strong>
              <span>等待</span>
            </div>
            <div className="divider" />
            <div>
              <strong className={stats.running > 0 ? "orange" : "muted"}>{stats.running}</strong>
              <span>进行中</span>
            </div>
            <div className="divider" />
            <div>
              <strong className="green">{stats.completed}</strong>
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

          <section className="panel history-panel">
            <div className="preview-header">
              <h2>历史记录</h2>
              <button className="refresh-button" type="button" onClick={refreshHistory}>
                刷新
              </button>
            </div>

            <div className="history-list">
              {history.length === 0 ? (
                <p className="history-empty">暂无生成记录</p>
              ) : (
                history.map((item) => (
                  <article key={item.id} className="history-item">
                    <div className="history-thumb">
                      {item.resultUrl && item.mode === "image" ? <img src={item.resultUrl} alt="" /> : null}
                      {item.resultUrl && item.mode === "video" ? <video src={item.resultUrl} muted playsInline /> : null}
                      {!item.resultUrl ? item.mode === "image" ? <ImageIcon size={24} /> : <Video size={24} /> : null}
                    </div>
                    <div className="history-meta">
                      <div>
                        <strong>{item.mode === "image" ? "图片" : "视频"}</strong>
                        <span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span>
                      </div>
                      <p>{item.prompt}</p>
                      <small>{item.size || item.ratio || item.model || item.createdAt}</small>
                    </div>
                    <div className="history-actions">
                      {item.resultUrl ? (
                        <a href={item.resultUrl} target="_blank" rel="noreferrer" aria-label="打开结果">
                          <Download size={16} />
                        </a>
                      ) : null}
                      <button type="button" onClick={() => deleteHistory(item.id)} aria-label="删除历史记录">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
