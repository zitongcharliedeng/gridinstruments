# MIDI Search

MIDI search adapters — discoverable MIDI libraries for the game feature.

The search system uses the [Adapter pattern](https://en.wikipedia.org/wiki/Adapter_pattern): each data source exposes a uniform `search` / `fetch` interface regardless of its underlying API. The pipeline is `adapter.search(query)` → `adapter.fetch(result)` → `parseMidi(buffer)` → `buildNoteGroups(events)`.

Adapters use module-level in-memory caching for GitHub tree responses. No localStorage, no IndexedDB — memory only, reset on page refresh.

## Internal GitHub API Types

The [GitHub Trees API](https://docs.github.com/en/rest/git/trees) returns a flat array of tree items when called with `?recursive=1`. Each item carries its repo-relative path, type (`blob` or `tree`), SHA, and API URL. Only `blob` items with a `.mid` extension are retained.

``` {.typescript file=_generated/lib/midi-search.ts}
interface GitHubTreeItem {
  path: string;
  type: string;
  sha: string;
  url: string;
}

interface GitHubTreeResponse {
  tree: GitHubTreeItem[];
}

```

## Public Search Result and Adapter Interface

`MidiSearchResult` is the common currency passed between `search()` and `fetch()`. The `fetchUrl` field is a direct URL to raw MIDI bytes — suitable for passing straight to `parseMidi()` after an `arrayBuffer()` call.

`MidiSearchAdapter` is the interface every adapter must satisfy. The `id` field is a stable dot-free identifier (e.g. `github:mutopia`) used for display attribution and deduplication. Both `search` and `fetch` return Promises; `search` must never throw — it returns an empty array on failure. `fetch` may throw on network error.

``` {.typescript file=_generated/lib/midi-search.ts}
export interface MidiSearchResult {
  title: string;
  source: string;
  sourceId: string;
  fetchUrl: string;
}

export interface MidiSearchAdapter {
  id: string;
  name: string;
  search(query: string): Promise<MidiSearchResult[]>;
  fetch(result: MidiSearchResult): Promise<ArrayBuffer>;
}

```

## GitHub Tree Loader

`loadGitHubMidis` fetches the full recursive file tree from a GitHub repository using the [Git Trees API](https://docs.github.com/en/rest/git/trees?apiVersion=2022-11-28#get-a-tree). The `?recursive=1` parameter causes GitHub to flatten the entire tree into a single response, avoiding pagination for all but the largest repos.

The result is stored in the caller-provided `cache` object — a mutable holder pattern that allows each adapter class to own its own cache without a shared module-level map. Subsequent calls return the cached array immediately without a network round-trip.

GitHub's unauthenticated rate limit is 60 requests per hour. The tree fetch counts as one request and is cached for the full browser session, so repeated searches cost nothing after the first.

``` {.typescript file=_generated/lib/midi-search.ts}
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
function encodeGitHubPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function rawUrl(owner: string, repo: string, path: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${encodeGitHubPath(path)}`;
}

```

## Tree Search Helper

`searchTree` performs a case-insensitive substring match against the repo-relative paths of all cached tree items. The display title strips the directory prefix and `.mid` extension, showing only the bare filename. Results include the full `fetchUrl` pointing to raw bytes, ready to pass to `parseMidi`.

``` {.typescript file=_generated/lib/midi-search.ts}
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
export class MidishareMidiAdapter implements MidiSearchAdapter {
  readonly id = 'midishare';
  readonly name = 'Midishare';
  private _cache: { midis: { id: string; title?: string; name?: string }[] | null } = {
    midis: null,
  };
```

`search` lazy-loads the full catalogue on the first call, caching it for subsequent queries. A failed list request returns an empty array rather than throwing, so a network error degrades gracefully without breaking the other adapters.

``` {.typescript file=_generated/lib/midi-search.ts}
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
        this._cache.midis = await response.json() as { id: string; title?: string; name?: string }[];
      } catch (err) {
        console.warn('[midi-search] midishare.dev fetch failed:', err);
        return [];
      }
    }

    const q = query.toLowerCase();
    const results: MidiSearchResult[] = [];

    for (const midi of this._cache.midis) {
      const displayName = midi.title ?? midi.name ?? midi.id;
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
```

`fetch` retrieves the raw MIDI bytes for a single search result. Errors are re-thrown after logging so the caller can surface them in the UI.

``` {.typescript file=_generated/lib/midi-search.ts}
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
const adapters: MidiSearchAdapter[] = [
  new GitHubMidiAdapter(),
  new MutopiaMidiAdapter(),
  new MidishareMidiAdapter(),
];

export interface SearchResult {
  results: MidiSearchResult[];
  errors: string[];
}

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
