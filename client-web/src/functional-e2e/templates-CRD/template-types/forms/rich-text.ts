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
 * Use `typeIntoRichTextEditor` or `fillRichTextEditor` for every rich-text
 * editor. Plain text inputs (titles, tags, URLs) should still use `.fill()`.
 */
/** The last non-empty line of `text` as the editor keeps it (see below). */
const anchorOf = (text: string): string | undefined =>
  text
    .split('\n')
    .map(line => line.replace(/^\s*(#{1,6}|[-*+]|\d+\.)\s+/, '').trim())
    .filter(Boolean)
    .pop();

/**
 * Whether the editor's own document holds `anchor`. Read from the Tiptap
 * instance on the ProseMirror root, not from the DOM: the DOM can show text
 * the editor has not taken in, and that text is dropped on submit.
 */
const editorHolds = (editor: Locator, anchor: string): Promise<boolean> =>
  editor.evaluate((root, wanted) => {
    const instance = (root as unknown as { editor?: { getText(): string } })
      .editor;
    const text = instance ? instance.getText() : (root.textContent ?? '');
    return text.includes(wanted);
  }, anchor);

/**
 * Puts `text` into the editor with `enter` and waits until the editor's own
 * document holds it; does it again when it does not. With several files
 * running, an editor that has only just mounted sometimes loses what was
 * entered in its first moments (a typed post template ended up empty, a filled
 * callout description was missing from the saved template), and the form was
 * then saved without it.
 *
 * The check anchors on the LAST non-empty line with its leading markdown token
 * stripped (Tiptap's input rules turn `# `/`- `/`1. ` into headings/lists,
 * dropping the marker), so it compares text Tiptap keeps verbatim, and proves
 * the entry reached the end.
 */
const enterUntilHeld = async (
  editor: Locator,
  text: string,
  enter: () => Promise<void>
): Promise<void> => {
  const anchor = anchorOf(text);
  await expect(async () => {
    await enter();
    if (anchor) {
      await expect
        .poll(() => editorHolds(editor, anchor), { timeout: 3_000 })
        .toBe(true);
    } else {
      await expect(editor).not.toBeEmpty({ timeout: 3_000 });
    }
  }).toPass({ timeout: 45_000 });
};

/**
 * Type into a Tiptap rich-text editor (see the file comment for why typing).
 * A second attempt starts from an empty editor.
 */
export async function typeIntoRichTextEditor(
  editor: Locator,
  text: string
): Promise<void> {
  await enterUntilHeld(editor, text, async () => {
    await editor.click();
    await editor.press('ControlOrMeta+a');
    await editor.press('Delete');
    await editor.pressSequentially(text);
  });
}

/**
 * `.fill()` a Tiptap rich-text editor whose content must stay literal (typing
 * `- ` would turn a line into a list item), and confirm the editor took it.
 */
export async function fillRichTextEditor(
  editor: Locator,
  text: string
): Promise<void> {
  await enterUntilHeld(editor, text, () => editor.fill(text));
}
