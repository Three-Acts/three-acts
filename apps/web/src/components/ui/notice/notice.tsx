/* eslint-disable react-refresh/only-export-components */
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@three-acts/utils";

type NoticeTone = "info" | "success" | "error";

const TONE: Record<NoticeTone, { className: string; role: "status" | "alert" }> = {
  info: { className: "border-line-strong/25 bg-surface-raised text-ink", role: "status" },
  success: { className: "border-moss/30 bg-moss/10 text-moss", role: "status" },
  error: { className: "border-red-200 bg-red-50 text-red-700", role: "alert" }
};

type RootProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  className?: string;
  tone?: NoticeTone;
  title?: ReactNode;
  children: ReactNode;
};

/**
 * An inline status message: form-submit confirmation, checkout errors, "your
 * cart changed" banners. `error` announces via `role="alert"` (interrupts);
 * `info`/`success` use `role="status"` (polite).
 */
function Root({ tone = "info", title, children, className, ...props }: RootProps) {
  const { className: toneClassName, role } = TONE[tone];
  return (
    <div role={role} className={cn("flex flex-col gap-1 border px-4 py-3 text-sm leading-6", toneClassName, className)} {...props}>
      {title && <p className="font-semibold">{title}</p>}
      <div>{children}</div>
    </div>
  );
}

export const Notice = {
  Root
};

export type { NoticeTone, RootProps as NoticeRootProps };
