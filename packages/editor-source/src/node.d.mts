import type { SourceEdit } from "./index";
export function patchSource(
  code: string,
  path: string,
  edits: SourceEdit[],
): Promise<string>;
export function sourceSha(code: string): string;

export function authoredSourceEdits(code: string, path: string): SourceEdit[];
