# MIDI Search

MIDI search adapters — discoverable MIDI libraries for the game feature.

The search system uses the [Adapter pattern](https://en.wikipedia.org/wiki/Adapter_pattern): each data source exposes a uniform `search` / `fetch` interface regardless of its underlying API. The pipeline is `adapter.search(query)` → `adapter.fetch(result)` → `parseMidi(buffer)` → `buildNoteGroups(events)`.

Adapters use module-level in-memory caching for GitHub tree responses. No localStorage, no IndexedDB — memory only, reset on page refresh.

## Internal GitHub API Types

The [GitHub Trees API](https://docs.github.com/en/rest/git/trees) returns a flat array of tree items when called with `?recursive=1`. Each item carries its repo-relative path, type (`blob` or `tree`), SHA, and API URL. Only `blob` items with a `.mid` extension are retained.

``` {.typescript file=_generated/lib/midi-search.ts}
/**
 * MIDI search adapters — discoverable MIDI libraries for the game feature.
 *
 * Pipeline: adapter.search(query) → adapter.fetch(result) → parseMidi(buffer) → buildNoteGroups(events)
 *
 * Adapters use module-level in-memory caching for GitHub tree responses.
 * No localStorage, no IndexedDB — memory only, reset on page refresh.
 */

type GitHubTreeItem = {
  path: string;
  type: string;
  sha: string;
  url: string;
};

type GitHubTreeResponse = {
  tree: GitHubTreeItem[];
};

```

## Public Search Result and Adapter Interface

`MidiSearchResult` is the common currency passed between `search()` and `fetch()`. The `fetchUrl` field is a direct URL to raw MIDI bytes — suitable for passing straight to `parseMidi()` after an `arrayBuffer()` call.

`MidiSearchAdapter` is the interface every adapter must satisfy. The `id` field is a stable dot-free identifier (e.g. `github:mutopia`) used for display attribution and deduplication. Both `search` and `fetch` return Promises; `search` must never throw — it returns an empty array on failure. `fetch` may throw on network error.

``` {.typescript file=_generated/lib/midi-search.ts}
/** A single result from a MIDI search adapter. */
export type MidiSearchResult = {
  /** Human-readable display name (filename without .mid extension). */
  title: string;
  /** Source identifier, e.g. "github:thewildwestmidis" or "github:mutopia". */
  source: string;
  /** Unique ID within source (file path within the repo). */
  sourceId: string;
  /** Direct URL to fetch the raw .mid bytes — compatible with parseMidi(). */
  fetchUrl: string;
};

/** Interface all MIDI search adapters must implement. */
export interface MidiSearchAdapter {
  /** Stable unique identifier for this adapter. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /**
   * Search for MIDI files matching the given query.
   * Returns empty array if nothing matches. Throws on network/parse failure.
   */
  search(query: string): Promise<MidiSearchResult[]>;
  /**
   * Fetch the raw .mid bytes for a search result.
   * Returns ArrayBuffer compatible with parseMidi(buffer).
   * Throws on network failure.
   */
  fetch(result: MidiSearchResult): Promise<ArrayBuffer>;
}

```

## GitHub Tree Loader

`loadGitHubMidis` fetches the full recursive file tree from a GitHub repository using the [Git Trees API](https://docs.github.com/en/rest/git/trees?apiVersion=2022-11-28#get-a-tree). The `?recursive=1` parameter causes GitHub to flatten the entire tree into a single response, avoiding pagination for all but the largest repos.

The result is stored in the caller-provided `cache` object — a mutable holder pattern that allows each adapter class to own its own cache without a shared module-level map. Subsequent calls return the cached array immediately without a network round-trip.

GitHub's unauthenticated rate limit is 60 requests per hour. The tree fetch counts as one request and is cached for the full browser session, so repeated searches cost nothing after the first.

``` {.typescript file=_generated/lib/midi-search.ts}
/**
 * Fetch the full file tree from a GitHub repo via the Trees API,
 * filtering for .mid blobs only. Caches the result in the provided holder.
 */
async function loadGitHubMidis(
  owner: string,
  repo: string,
  cache: { items: GitHubTreeItem[] | null },
): Promise<GitHubTreeItem[]> {
  if (cache.items !== null) return cache.items;

  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `[midi-search] GitHub trees API error for ${owner}/${repo}: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json() as GitHubTreeResponse;
  cache.items = data.tree.filter(item => item.type === 'blob' && item.path.endsWith('.mid'));
  return cache.items;
}

```

## Path Encoding and Raw URL Construction

GitHub serves raw file content from `raw.githubusercontent.com`. The URL structure is `/{owner}/{repo}/{ref}/{path}`. Path segments must be percent-encoded individually — encoding the entire path at once would double-encode the `/` separators.

Both `api.github.com` and `raw.githubusercontent.com` include `Access-Control-Allow-Origin: *` response headers, making them safe to call directly from browser JavaScript without a proxy.

``` {.typescript file=_generated/lib/midi-search.ts}
/** Encode a repo-relative file path for use in a raw.githubusercontent.com URL. */
function encodeGitHubPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

/** Build a raw.githubusercontent.com content URL for a file in a GitHub repo. */
function rawUrl(owner: string, repo: string, path: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${encodeGitHubPath(path)}`;
}

```

## Tree Search Helper

`searchTree` performs a case-insensitive substring match against the repo-relative paths of all cached tree items. The display title strips the directory prefix and `.mid` extension, showing only the bare filename. Results include the full `fetchUrl` pointing to raw bytes, ready to pass to `parseMidi`.

``` {.typescript file=_generated/lib/midi-search.ts}
/**
 * Case-insensitive substring search over a cached MIDI tree.
 * Extracts the filename (last path segment) as the display title.
 */
function searchTree(
  tree: GitHubTreeItem[],
  query: string,
  owner: string,
  repo: string,
  source: string,
): MidiSearchResult[] {
  const q = query.toLowerCase();
  const results: MidiSearchResult[] = [];

  for (const item of tree) {
    if (!item.path.toLowerCase().includes(q)) continue;

    const lastSlash = item.path.lastIndexOf('/');
    const filename = lastSlash >= 0 ? item.path.slice(lastSlash + 1) : item.path;
    const title = filename.endsWith('.mid') ? filename.slice(0, -4) : filename;

    results.push({
      title,
      source,
      sourceId: item.path,
      fetchUrl: rawUrl(owner, repo, item.path),
    });
  }

  return results;
}

```

## Raw Bytes Fetcher

A small shared helper that wraps `fetch` + `arrayBuffer()` with a descriptive error on non-200 responses. The returned `ArrayBuffer` is passed directly to `parseMidi(buffer)`.

``` {.typescript file=_generated/lib/midi-search.ts}
/** Fetch raw bytes from a URL, returning an ArrayBuffer. Throws on HTTP error. */
async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[midi-search] Fetch failed (${response.status}): ${url}`);
  }
  return response.arrayBuffer();
}

```

## Wild West MIDIs Adapter

[thewildwestmidis/midis](https://github.com/thewildwestmidis/midis) is a community-contributed collection of approximately 1 700 `.mid` files in a flat directory structure. Files are diverse in genre and quality — useful for broad search coverage.

The adapter holds its own `_cache` object so the tree is loaded once per browser session. Both `search` and `fetch` delegate to the shared helpers above.

``` {.typescript file=_generated/lib/midi-search.ts}
/**
 * Adapter for the thewildwestmidis/midis GitHub repository.
 *
 * Data source: https://github.com/thewildwestmidis/midis
 * Contains ~1,700 .mid files in a flat directory structure.
 *
 * GitHub Trees API: https://api.github.com/repos/thewildwestmidis/midis/git/trees/HEAD?recursive=1
 * Raw content URL: https://raw.githubusercontent.com/thewildwestmidis/midis/HEAD/{filename}
 *
 * CORS: GitHub API includes CORS headers; raw.githubusercontent.com returns
 * Access-Control-Allow-Origin: * — both are safe to call from the browser.
 *
 * Rate limit: 60 unauthenticated requests/hour. The tree fetch counts as 1 request
 * and is cached in module memory for the duration of the browser session.
 *
 * Limitation: Community-contributed files — quality and accuracy vary.
 */
export class GitHubMidiAdapter implements MidiSearchAdapter {
  readonly id = 'github:thewildwestmidis';
  readonly name = 'Wild West MIDIs';
  private readonly _owner = 'thewildwestmidis';
  private readonly _repo = 'midis';
  private readonly _cache: { items: GitHubTreeItem[] | null } = { items: null };

  async search(query: string): Promise<MidiSearchResult[]> {
    const tree = await loadGitHubMidis(this._owner, this._repo, this._cache);
    return searchTree(tree, query, this._owner, this._repo, this.id);
  }

  async fetch(result: MidiSearchResult): Promise<ArrayBuffer> {
    return fetchArrayBuffer(result.fetchUrl);
  }
}

```

## Mutopia Project Adapter

[MutopiaProject/MutopiaProject](https://github.com/MutopiaProject/MutopiaProject) contains approximately 2 124 classical music pieces arranged in a `ftp/Composer/Catalog/` directory hierarchy. All pieces are in the public domain or licensed under Creative Commons. The tree is large — the initial recursive fetch takes a few seconds on a cold cache.

``` {.typescript file=_generated/lib/midi-search.ts}
/**
 * Adapter for the MutopiaProject/MutopiaProject GitHub repository.
 *
 * Data source: https://github.com/MutopiaProject/MutopiaProject
 * Contains ~2,124 classical music pieces in nested ftp/Composer/Catalog/ structure.
 *
 * GitHub Trees API: https://api.github.com/repos/MutopiaProject/MutopiaProject/git/trees/HEAD?recursive=1
 * Raw content URL: https://raw.githubusercontent.com/MutopiaProject/MutopiaProject/HEAD/{path}
 *
 * CORS: GitHub API includes CORS headers; raw.githubusercontent.com returns
 * Access-Control-Allow-Origin: * — both are safe to call from the browser.
 *
 * Rate limit: 60 unauthenticated requests/hour. The tree fetch counts as 1 request
 * and is cached in module memory for the duration of the browser session.
 *
 * Limitation: Classical music focus only; pieces arranged by composer and catalog number.
 * The tree is large — initial load takes a few seconds on the first search.
 */
export class MutopiaMidiAdapter implements MidiSearchAdapter {
  readonly id = 'github:mutopia';
  readonly name = 'Mutopia Project';
  private readonly _owner = 'MutopiaProject';
  private readonly _repo = 'MutopiaProject';
  private readonly _cache: { items: GitHubTreeItem[] | null } = { items: null };

  async search(query: string): Promise<MidiSearchResult[]> {
    const tree = await loadGitHubMidis(this._owner, this._repo, this._cache);
    return searchTree(tree, query, this._owner, this._repo, this.id);
  }

  async fetch(result: MidiSearchResult): Promise<ArrayBuffer> {
    return fetchArrayBuffer(result.fetchUrl);
  }
}

```

## Midishare Adapter

[midishare.dev](https://midishare.dev) is a public-domain classical MIDI library created by the sightread team after MuseScore shut down their public API. It exposes two endpoints: a list endpoint (`GET /api/midis`) returning JSON metadata, and a fetch endpoint (`GET /api/midi?id=<id>`) returning raw bytes.

The adapter handles the unstable API gracefully: a list failure returns empty results and logs a warning rather than throwing. The fetch path similarly catches errors and re-throws so the caller sees a clean error. Metadata objects may carry either `title` or `name` for the display label; the adapter checks both with a fallback to the raw `id`.

``` {.typescript file=_generated/lib/midi-search.ts}
/**
 * Adapter for midishare.dev — a public domain MIDI library.
 *
 * Data source: https://midishare.dev
 * Created by the sightread team after MuseScore shut down their API.
 * Redistributes public domain classical music content.
 *
 * API endpoints:
 * - List: GET https://midishare.dev/api/midis — returns JSON array of MIDI metadata
 * - Fetch: GET https://midishare.dev/api/midi?id=<id> — returns raw MIDI bytes
 *
 * CORS: midishare.dev returns Access-Control-Allow-Origin: * — safe to call from browser.
 *
 * Stability: API marked "unstable" — may return non-200 status or be temporarily unavailable.
 * This adapter handles errors gracefully: returns empty results on API failure, never throws.
 *
 * Caching: The MIDI list is cached in module memory for the duration of the browser session.
 *
 * Metadata shape: Objects with `id`, `title`, and/or `name` fields. The adapter handles both.
 */
export class MidishareMidiAdapter implements MidiSearchAdapter {
  readonly id = 'midishare';
  readonly name = 'Midishare';
  private _cache: { midis: Array<{ id: string; title?: string; name?: string }> | null } = {
    midis: null,
  };

  async search(query: string): Promise<MidiSearchResult[]> {
    if (this._cache.midis === null) {
      try {
        const response = await fetch('https://midishare.dev/api/midis');
        if (!response.ok) {
          console.warn(
            `[midi-search] midishare.dev API error: ${response.status} ${response.statusText}`,
          );
          return [];
        }
        this._cache.midis = await response.json() as Array<{
          id: string;
          title?: string;
          name?: string;
        }>;
      } catch (err) {
        console.warn('[midi-search] midishare.dev fetch failed:', err);
        return [];
      }
    }

    const q = query.toLowerCase();
    const results: MidiSearchResult[] = [];

    for (const midi of this._cache.midis) {
      const displayName = midi.title || midi.name || midi.id;
      if (!displayName.toLowerCase().includes(q)) continue;

      results.push({
        title: displayName,
        source: this.id,
        sourceId: midi.id,
        fetchUrl: `https://midishare.dev/api/midi?id=${encodeURIComponent(midi.id)}`,
      });
    }

    return results;
  }

  async fetch(result: MidiSearchResult): Promise<ArrayBuffer> {
    try {
      const response = await fetch(result.fetchUrl);
      if (!response.ok) {
        throw new Error(
          `[midi-search] midishare.dev fetch failed: ${response.status} ${response.statusText}`,
        );
      }
      return response.arrayBuffer();
    } catch (err) {
      console.warn('[midi-search] midishare.dev fetch error:', err);
      throw err;
    }
  }
}

```

## Adapter Registry and Composite Search

The three adapter instances are registered in a module-level array. `searchAllAdapters` fans out to all of them in parallel using `Promise.allSettled`, which — unlike `Promise.all` — never short-circuits on failure. A rejected adapter logs a warning and contributes an empty array; the merged result always includes output from every adapter that succeeded.

``` {.typescript file=_generated/lib/midi-search.ts}
/** Registered adapters — all available MIDI data sources. */
const adapters: MidiSearchAdapter[] = [
  new GitHubMidiAdapter(),
  new MutopiaMidiAdapter(),
  new MidishareMidiAdapter(),
];

export type SearchResult = {
  results: MidiSearchResult[];
  errors: string[];
};

/**
 * Search all registered adapters in parallel.
 * Failed adapters are reported in `errors` — never throws.
 * Results from all adapters are merged into a single flat array.
 */
export async function searchAllAdapters(query: string): Promise<SearchResult> {
  const errors: string[] = [];
  const settled = await Promise.allSettled(
    adapters.map(adapter =>
      adapter.search(query).catch((err: unknown): MidiSearchResult[] => {
        const msg = err instanceof Error ? err.message : String(err);
        const short = msg.includes('403') ? `${adapter.name}: rate limited (60/hr)` :
                      msg.includes('404') ? `${adapter.name}: not found` :
                      `${adapter.name}: ${msg.slice(0, 60)}`;
        errors.push(short);
        return [];
      }),
    ),
  );
  const results = settled.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  return { results, errors };
}
```
