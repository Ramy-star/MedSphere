declare module '@/lib/chat-formatter/chat-formatter.js' {
  export function toSanitizedHtml(input: string): string;
  export function formatForModel(input: string): { markdown: string; warnings: string[] };
  export function renderModelOutput(input: string, container?: HTMLElement): void;
}
