import { Locator, expect } from '@playwright/test';

/**
 * Type into a Tiptap (ProseMirror) rich-text editor.
 *
 * A programmatic `.fill()` updates the editor's visible DOM but does NOT fire
 * Tiptap's `onChange`, so the form model stays empty and the value is dropped
 * on submit. This races clean on localhost but reproducibly fails on the slower
 * test env — e.g. creating a Post template there was rejected with "Post
 * Template requires default description input" (Error 12101). Typing sends real
 * input events so the editor updates its model and the value binds to the form.
 *
 * Use this for every "Write …" / default-description rich-text editor. Plain
 * text inputs (titles, tags, URLs) should still use `.fill()`.
 */
export async function typeIntoRichTextEditor(
  editor: Locator,
  text: string
): Promise<void> {
  await editor.click();
  await editor.pressSequentially(text);

  // Confirm the content actually registered — a partial insertion must not pass.
  // Anchor on the LAST non-empty line with its leading markdown token stripped
  // (Tiptap's input rules turn `# `/`- `/`1. ` into headings/lists, dropping the
  // marker), so we assert against text Tiptap keeps verbatim. Using the last
  // line also proves typing reached the end. The anchor lives inside a single
  // block, so `toContainText` (which concatenates block text) matches reliably.
  const anchor = text
    .split('\n')
    .map(line => line.replace(/^\s*(#{1,6}|[-*+]|\d+\.)\s+/, '').trim())
    .filter(Boolean)
    .pop();
  if (anchor) {
    await expect(editor).toContainText(anchor);
  } else {
    await expect(editor).not.toBeEmpty();
  }
}
