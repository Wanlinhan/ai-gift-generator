import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 图片礼物生成器",
  description: "本地可运行的 AI 图片礼物生成器"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
