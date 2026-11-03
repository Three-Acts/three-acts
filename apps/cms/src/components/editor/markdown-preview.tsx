import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
/** Raw HTML is skipped; react-markdown's default URL policy rejects unsafe schemes. */
export function MarkdownPreview({ source }: { source: string }) {
  return <div className="grid gap-3 max-w-none whitespace-normal [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_pre]:overflow-auto [&_pre]:bg-cms-surface [&_pre]:p-3 [&_a]:underline" aria-label="Markdown preview"><Markdown remarkPlugins={[remarkGfm]} skipHtml>{source}</Markdown></div>;
}
