/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";

type NoticeTone = "info" | "success" | "error";

/** No colour left to carry tone — the leading word does instead. */
const TONE_WORD: Record<NoticeTone, string> = {
  info: "Note:",
  success: "Success:",
  error: "Error:"
};

const TONE_ROLE: Record<NoticeTone, "status" | "alert"> = {
  info: "status",
  success: "status",
  error: "alert"
};

type RootProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  className?: string;
  tone?: NoticeTone;
  title?: ReactNode;
  children: ReactNode;
};

/**
 * An inline status message: form-submit confirmation, checkout errors, "your
 * cart changed" banners. A hairline box with a thicker left rule; the leading
 * word ("Note:"/"Success:"/"Error:") carries the tone, not colour. `error`
 * announces via `role="alert"` (interrupts); `info`/`success` use
 * `role="status"` (polite).
 */
function Root({ tone = "info", title, children, className, ...props }: RootProps) {
  const word = TONE_WORD[tone];
  return (
    <div
      role={TONE_ROLE[tone]}
      className={cn("flex flex-col gap-1 border border-line-strong border-l-4 p-4 text-body text-ink", className)}
      {...props}
    >
      {title ? (
        <p className="font-medium">
          <span className="mr-2">{word}</span>
          {title}
        </p>
      ) : null}
      <div>
        {!title && <span className="mr-1 font-medium">{word}</span>}
        {children}
      </div>
    </div>
  );
}

export const Notice = {
  Root
};

export type { NoticeTone, RootProps as NoticeRootProps };
