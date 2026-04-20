import { describe, it, expect, vi } from 'vitest';
import { enrichLinks, type IssueFetcher } from '../src/enrich/github-links.js';

function makeFetcher(
  responses: Record<string, { data?: { title: string; state: 'open' | 'closed' }; error?: { status: number } }>,
): IssueFetcher & { calls: string[] } {
  const calls: string[] = [];
  const fetcher: IssueFetcher = async ({ owner, repo, issue_number }) => {
    const key = `${owner}/${repo}#${issue_number}`;
    calls.push(key);
    const r = responses[key];
    if (r?.error) {
      const err = new Error(`HTTP ${r.error.status}`) as Error & { status: number };
      err.status = r.error.status;
      throw err;
    }
    if (r?.data) return r.data;
    throw new Error('unexpected');
  };
  return Object.assign(fetcher, { calls });
}

describe('enrich/github-links', () => {
  it('returns title + state for a successful lookup', async () => {
    const fetcher = makeFetcher({
      'alkem-io/server#4567': { data: { title: 'Fix space permissions', state: 'closed' } },
    });
    const results = await enrichLinks(['alkem-io/server#4567'], { fetcher });
    const entry = results.get('alkem-io/server#4567');
    expect(entry).toEqual({ ref: 'alkem-io/server#4567', title: 'Fix space permissions', state: 'closed' });
  });

  it('gracefully degrades to a null title/state on 404 / 403', async () => {
    const fetcher = makeFetcher({
      'alkem-io/private#1':  { error: { status: 404 } },
      'alkem-io/blocked#2':  { error: { status: 403 } },
    });
    const results = await enrichLinks(['alkem-io/private#1', 'alkem-io/blocked#2'], { fetcher });
    expect(results.get('alkem-io/private#1')).toEqual({ ref: 'alkem-io/private#1', title: null, state: null });
    expect(results.get('alkem-io/blocked#2')).toEqual({ ref: 'alkem-io/blocked#2', title: null, state: null });
  });

  it('caches results per build — identical refs are fetched only once', async () => {
    const fetcher = makeFetcher({
      'alkem-io/server#1': { data: { title: 'One', state: 'open' } },
    });
    await enrichLinks(
      ['alkem-io/server#1', 'alkem-io/server#1', 'alkem-io/server#1'],
      { fetcher },
    );
    expect(fetcher.calls).toEqual(['alkem-io/server#1']);
  });

  it('does not throw on arbitrary network error', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    const results = await enrichLinks(['alkem-io/server#99'], { fetcher });
    expect(results.get('alkem-io/server#99')).toEqual({ ref: 'alkem-io/server#99', title: null, state: null });
  });

  it('ignores refs to orgs outside the allowlist', async () => {
    const fetcher = makeFetcher({});
    const results = await enrichLinks(['attacker/evil#1'], {
      fetcher,
      allowedOrgs: ['alkem-io'],
    });
    expect(results.size).toBe(0);
    expect(fetcher.calls).toEqual([]);
  });
});
