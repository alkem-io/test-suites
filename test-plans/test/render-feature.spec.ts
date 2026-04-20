import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeatureLibraries } from '../src/parse/feature-library.js';
import { renderFeatureView } from '../src/render/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');

describe('render/dashboard — renderFeatureView', () => {
  it('renders a feature view containing all cases, metadata, and links', async () => {
    const [library] = await loadFeatureLibraries(fixturesDir);
    const html = await renderFeatureView({
      library,
      generatedAt: '2026-04-17T12:00:00Z',
      depth: 1,
    });

    // Layout shell is wrapping the content
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Alkemio QA test plans');

    // Feature heading
    expect(html).toContain('Fixture Feature');

    // Both cases present
    expect(html).toContain('TC-9001');
    expect(html).toContain('TC-9002');

    // Case metadata and chips rendered
    expect(html).toMatch(/chip-priority[^>]*>P1/);
    expect(html).toMatch(/chip-state-ready[^>]*>Ready/);
    expect(html).toMatch(/chip-automation-required[^>]*>required/);

    // Steps rendered via markdown-it (ordered list)
    expect(html).toContain('<ol>');
    expect(html).toContain('Do the first thing.');

    // Cross-repo link chip for TC-9001
    expect(html).toContain('alkem-io/server#4567');
    expect(html).toContain('https://github.com/alkem-io/server/issues/4567');

    // Base prefix for depth=1 (features/<slug>.html) uses ../
    expect(html).toContain('href="../assets/style.css"');
    expect(html).toContain('href="../index.html"');
  });

  it('renders an empty-state feature view when no cases exist', async () => {
    const html = await renderFeatureView({
      library: { feature: 'Empty', slug: 'empty', path: '/virtual/empty.md', cases: [] },
      generatedAt: '2026-04-17T12:00:00Z',
      depth: 1,
    });
    expect(html).toContain('No test cases defined for this feature yet.');
  });
});
