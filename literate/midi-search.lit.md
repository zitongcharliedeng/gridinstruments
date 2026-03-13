# MIDI Search

MIDI search adapters — discoverable MIDI libraries for the game feature.

Pipeline: `adapter.search(query)` → `adapter.fetch(result)` → `parseMidi(buffer)` → `buildNoteGroups(events)`

Adapters use module-level in-memory caching for GitHub tree responses. No localStorage, no IndexedDB — memory only, reset on page refresh.

``` {.typescript file=src/lib/midi-search.ts}
/**
 * MIDI search adapters — discoverable MIDI libraries for the game feature.
 *
 * Pipeline: adapter.search(query) → adapter.fetch(result) → parseMidi(buffer) → buildNoteGroups(events)
 *
 * Adapters use module-level in-memory caching for GitHub tree responses.
 * No localStorage, no IndexedDB — memory only, reset on page refresh.
 */

// ---------------------------------------------------------------------------
// Internal GitHub API types
// ---------------------------------------------------------------------------

type GitHubTreeItem = {
  path: string;
  type: string;
  sha: string;
  url: string;
};

type GitHubTreeResponse = {
  tree: GitHubTreeItem[];
};

// ---------------------------------------------------------------------------
// Exported types and interface
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Internal helpers — not exported
// ---------------------------------------------------------------------------

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

/** Encode a repo-relative file path for use in a raw.githubusercontent.com URL. */
function encodeGitHubPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

/** Build a raw.githubusercontent.com content URL for a file in a GitHub repo. */
function rawUrl(owner: string, repo: string, path: string): string {
  return `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${encodeGitHubPath(path)}`;
}

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

/** Fetch raw bytes from a URL, returning an ArrayBuffer. Throws on HTTP error. */
async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[midi-search] Fetch failed (${response.status}): ${url}`);
  }
  return response.arrayBuffer();
}

// ---------------------------------------------------------------------------
// Exported adapter classes
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Composite search
// ---------------------------------------------------------------------------

/** Registered adapters — all available MIDI data sources. */
const adapters: MidiSearchAdapter[] = [
  new GitHubMidiAdapter(),
  new MutopiaMidiAdapter(),
  new MidishareMidiAdapter(),
];

/**
 * Search all registered adapters in parallel.
 * Failed adapters log a warning and contribute an empty array — never throws.
 * Results from all adapters are merged into a single flat array.
 */
export async function searchAllAdapters(query: string): Promise<MidiSearchResult[]> {
  const results = await Promise.allSettled(
    adapters.map(adapter =>
      adapter.search(query).catch((err: unknown): MidiSearchResult[] => {
        console.warn(`[midi-search] ${adapter.id} failed:`, err);
        return [];
      }),
    ),
  );
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}
```
