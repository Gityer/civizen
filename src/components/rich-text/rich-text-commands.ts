export function applyRichTextCommand(
  editor: HTMLElement | null,
  command: string,
  commandValue?: string,
) {
  editor?.focus();
  document.execCommand(command, false, commandValue);
}
