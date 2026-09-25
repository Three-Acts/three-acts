/* eslint-disable react-refresh/only-export-components */
import { Fragment, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@three-acts/utils";

type Block = { type: "h2"; text: string } | { type: "ul"; items: string[] } | { type: "p"; lines: string[] };

/**
 * Splits a plain-text body into paragraph/heading/list blocks. A blank line
 * ends the current paragraph or list. A line starting with `## ` becomes its
 * own heading; consecutive lines starting with `- ` batch into one list.
 * Everything else accumulates into the current paragraph (soft-wrapped with
 * `<br />` between its lines, not joined into one line).
 */
function parseBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "p", lines: paragraph });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "ul", items: list });
      list = [];
    }
  };

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (line === "") {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2).trim());
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();

  return blocks;
}

const LINK_PATTERN = /(https?:\/\/[^\s)]+)|(\/(?:shop|blog)\/[a-zA-Z0-9\-/_]+)/g;

/** Turns bare `/shop/...`, `/blog/...` paths and `https://` URLs in `text` into real anchors. Everything else stays plain text — never HTML. */
function autolink(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let index = 0;
  LINK_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = LINK_PATTERN.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const href = match[0];
    const isExternal = href.startsWith("http");
    nodes.push(
      <a
        key={`${keyPrefix}-${index++}`}
        href={href}
        className="text-ink underline decoration-1 underline-offset-2 hover:no-underline"
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {href}
      </a>
    );
    lastIndex = match.index + href.length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
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
  const blocks = parseBlocks(body);

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
