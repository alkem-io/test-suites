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
  await expect(editor).not.toBeEmpty();
}
