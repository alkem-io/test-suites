import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';
import type { EnrichedLink } from '../types.js';

export interface IssueFetchRequest {
  owner: string;
  repo: string;
  issue_number: number;
}

export interface IssueFetchResponse {
  title: string;
  state: 'open' | 'closed';
}

/**
 * Minimal abstraction over `octokit.issues.get`. Injectable so tests can
 * supply a fake without running a real HTTP client.
 */
export type IssueFetcher = (req: IssueFetchRequest) => Promise<IssueFetchResponse>;

export interface EnrichOptions {
  /** GitHub personal-access or workflow token. Defaults to `process.env.GITHUB_TOKEN`. */
  token?: string;
  /** If set, only refs under these org names are fetched; others are silently dropped. */
  allowedOrgs?: string[];
  /** Injectable fetcher (for tests). Defaults to a throttling-enabled Octokit client. */
  fetcher?: IssueFetcher;
}

const REF_RE = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#([1-9][0-9]*)$/;

function parseRef(ref: string): { owner: string; repo: string; number: number } | null {
  const m = REF_RE.exec(ref);
  if (!m) return null;
  return { owner: m[1], repo: m[2], number: Number(m[3]) };
}

function defaultFetcher(token: string | undefined): IssueFetcher {
  const MyOctokit = Octokit.plugin(throttling);
  const octokit = new MyOctokit({
    auth: token,
    throttle: {
      onRateLimit: () => false,
      onSecondaryRateLimit: () => false,
    },
  });
  return async (req) => {
    const { data } = await octokit.issues.get({
      owner: req.owner,
      repo: req.repo,
      issue_number: req.issue_number,
    });
    return {
      title: data.title,
      state: (data.state === 'closed' ? 'closed' : 'open') as 'open' | 'closed',
    };
  };
}

/**
 * Enriches a set of `org/repo#N` cross-repo references with the target
 * issue's title and open/closed state.
 *
 * Never throws: any error (404, 403, rate-limit, network) results in a
 * `{ title: null, state: null }` entry so the dashboard can fall back to a
 * plain link. Identical refs are fetched once per call.
 */
export async function enrichLinks(
  refs: string[],
  options: EnrichOptions = {},
): Promise<Map<string, EnrichedLink>> {
  const results = new Map<string, EnrichedLink>();
  const unique = [...new Set(refs)];
  const fetcher = options.fetcher ?? defaultFetcher(options.token ?? process.env.GITHUB_TOKEN);

  for (const ref of unique) {
    const parsed = parseRef(ref);
    if (!parsed) continue;
    if (options.allowedOrgs && !options.allowedOrgs.includes(parsed.owner)) {
      continue;
    }
    try {
      const resp = await fetcher({ owner: parsed.owner, repo: parsed.repo, issue_number: parsed.number });
      results.set(ref, { ref, title: resp.title, state: resp.state });
    } catch {
      results.set(ref, { ref, title: null, state: null });
    }
  }

  return results;
}
