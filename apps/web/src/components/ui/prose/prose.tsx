/* eslint-disable react-refresh/only-export-components */
import { Fragment, type HTMLAttributes, type ReactNode } from "react";
import { cn, parseProse, proseRuns } from "@three-acts/utils";

function autolink(text: string, keyPrefix: string): ReactNode[] {
  return proseRuns(text).map((run, index) => run.href ? (
    <a key={`${keyPrefix}-${index}`} href={run.href} className="text-ink underline decoration-1 underline-offset-2 hover:no-underline" {...(run.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{run.text}</a>
  ) : run.text);
}

type ProseProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
  /** Plain text, `\n\n`-separated into paragraphs. No markdown/HTML parsing beyond `## `, `- ` and autolinked URLs/paths. */
  body: string;
};

/**
 * Renders long-form plain text (article bodies, product descriptions, FAQ
 * answers) as real, accessible HTML — never `dangerouslySetInnerHTML`. Editors
 * write plain text in the CMS; this is the one place that text becomes
 * headings, lists, paragraphs and links.
 */
function Root({ body, className, ...props }: ProseProps) {
  const blocks = parseProse(body);

  return (
    <div className={cn("flex flex-col gap-5 text-body text-ink", className)} {...props}>
      {blocks.map((block, blockIndex) => {
        if (block.type === "h2") {
          return (
            <h2 key={blockIndex} className="mt-2 text-h3 font-medium text-ink first:mt-0">
              {autolink(block.text, `h${blockIndex}`)}
            </h2>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={blockIndex} className="flex list-disc flex-col gap-2 pl-5 marker:text-ink">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{autolink(item, `u${blockIndex}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={blockIndex}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {autolink(line, `p${blockIndex}-${lineIndex}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

export const Prose = {
  Root
};

export type { ProseProps };
