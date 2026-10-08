export type ProseBlock = { type: "h2"; text: string } | { type: "ul"; items: string[] } | { type: "p"; lines: string[] };
export const proseFormatHelp = "Plain source text: blank lines separate paragraphs, ## starts a heading, - starts a list item. Web and shop/blog URLs become links. HTML stays literal.";

/** The site's deliberately small body format; never interpret source as HTML. */
export function parseProse(body: string): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => { if (paragraph.length) { blocks.push({ type: "p", lines: paragraph }); paragraph = []; } };
  const flushList = () => { if (list.length) { blocks.push({ type: "ul", items: list }); list = []; } };
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); }
    else if (line.startsWith("## ")) { flushParagraph(); flushList(); blocks.push({ type: "h2", text: line.slice(3).trim() }); }
    else if (line.startsWith("- ")) { flushParagraph(); list.push(line.slice(2).trim()); }
    else { flushList(); paragraph.push(line); }
  }
  flushParagraph(); flushList();
  return blocks;
}

export function proseRuns(text: string): Array<{ text: string; href?: string }> {
  const runs: Array<{ text: string; href?: string }> = [];
  const pattern = /(https?:\/\/[^\s)]+)|(\/(?:shop|blog)\/[a-zA-Z0-9\-/_]+)/g;
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index;
    if (index > end) runs.push({ text: text.slice(end, index) });
    runs.push({ text: match[0], href: match[0] });
    end = index + match[0].length;
  }
  if (end < text.length) runs.push({ text: text.slice(end) });
  return runs;
}
