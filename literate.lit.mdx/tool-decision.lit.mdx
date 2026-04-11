# Literate Programming Framework Selection

**Decision date**: March 2026  
**Chosen tool**: Entangled 2.4.2  
**Project**: GridInstruments (TypeScript, Vite, Web Audio, Playwright)

---

## Why This Document Exists

This file is itself a literate document. The irony is intentional: the first `.lit.md` in the project records why we chose the tool that produces `.lit.md` files.

In March 2026, three articles landed in the same week that crystallized something many developers had been circling around:

1. "We should revisit literate programming in the agent era" (silly.business) argues that LP eliminates the "fundamental extra labor" problem that killed it in the 1990s. Agents can read prose context and generate or maintain the narrative. The human writes the *why*; the agent handles the *what*.

2. "Literate Programming and AI Agents Solve Maintenance" (byteiota.com) frames context engineering as 2026's AI coding bottleneck. LP provides scalable, persistent context that survives session boundaries.

3. The core insight across both: **LP + AI = the agent reads WHY, not just WHAT**. A `.lit.md` file that explains architectural decisions makes future AI assistance dramatically better. The agent isn't guessing intent from variable names; it's reading the author's reasoning.

GridInstruments is a browser synthesizer with a complex geometry engine, a microtonal tuning system, and a canvas renderer. The code is dense. The decisions are non-obvious. LP is the right tool.

---

## What We Actually Need

Before evaluating tools, the requirements:

1. **Tangle**: extract code blocks from `.lit.md` into real `.ts` files the build system can consume
2. **Bidirectional sync**: edit the `.ts` file in an IDE, run a command, and see the `.lit.md` updated to match
3. **TypeScript support**: the project is TypeScript, Vite, npm — not Python, R, or Clojure
4. **Nix-compatible**: the devshell is the only sanctioned entry point; the tool must be installable without breaking the flake
5. **No framework lock-in**: we don't want to adopt React, Deno, or Jupyter just to get LP

Bidirectional sync was the decisive requirement. Without it, developers are forced to edit `.lit.md` exclusively, which breaks IDE tooling, LSP, and the existing Playwright test suite. With it, you can work in either direction.

---

## Tier 1: True Tangle Tools

These tools actually extract code from prose documents. This is the only tier that could satisfy requirement 1.

### Entangled 2.4.2 — WINNER

**What it does**: Bidirectional sync between `.lit.md` files and source files. `entangled tangle` extracts code blocks into `.ts` files. `entangled stitch` reads edited `.ts` files and updates the corresponding code blocks in `.lit.md`. `entangled watch` runs a daemon that does both continuously.

**Why it won**:

- **Bidirectional sync (stitch)**: The decisive feature. Edit `_generated/lib/keyboard-visualizer.ts` in VS Code with full LSP support, run `entangled stitch`, and the `.lit.md` updates. No other tool in this evaluation offers this.
- **Language-agnostic**: Works with any language. TypeScript support requires adding `[[languages]]` config, which is two lines in `entangled.toml`.
- **VSCode extension**: Real-time sync between `.lit.md` and `.ts` files in the editor. The extension watches both sides.
- **Institutional backing**: Developed and maintained by the Netherlands eScience Center. Used in actual scientific software projects. Not a weekend project.
- **Stable release**: 2.4.2, active development, Python implementation installable via pip. The Python version means `pip install entangled-cli` works inside the Nix devshell without a Haskell toolchain.
- **Watch mode**: `entangled watch` daemon for continuous sync during development. The workflow becomes: open `.lit.md` in one pane, open `.ts` in another, edit either, watch them stay in sync.

### @thi.ng/tangle

**What it does**: Extracts code blocks from markdown into files. Part of the `@thi.ng` ecosystem by Karsten Schmidt.

**Rejection reason**: Unidirectional only. There is no `stitch` equivalent. You can extract code from `.lit.md` into `.ts`, but if you edit the `.ts` file, there is no mechanism to propagate those changes back. This means developers must edit `.lit.md` exclusively, which breaks IDE tooling, LSP hover, and the existing Playwright test suite that imports from `.ts` paths. The bidirectional sync was the decisive requirement, and `@thi.ng/tangle` doesn't have it.

### zyedidia/Literate

**What it does**: A literate programming tool inspired by Knuth's WEB, written in D.

**Rejection reason**: Three compounding problems. First, it's written in D, which requires a D compiler. The D compiler (`dmd` or `ldc`) is in nixpkgs but adds a non-trivial dependency to the devshell for a tool that isn't the primary language of the project. Second, the project is unmaintained: the last commit was in 2020. No TypeScript ecosystem integration, no watch mode, no VSCode extension. Third, even if we accepted the D dependency and the maintenance risk, it's unidirectional — no bidirectional sync.

### org-babel

**What it does**: Emacs Org-mode's code execution and extraction system. The original literate programming environment for many developers.

**Rejection reason**: Requires Emacs as a build dependency. Emacs is in nixpkgs and could be added to the devshell, but this makes the entire build pipeline Emacs-dependent. GridInstruments is a browser synthesizer; its devshell should not require a text editor to build. More fundamentally, org-babel is not editor-agnostic: the `.org` file format is Emacs-native, and the tooling assumes Emacs for editing. Contributors who don't use Emacs would face a hostile workflow. The project's existing toolchain (VS Code, Vite, Playwright) has no Emacs dependency and should not acquire one.

---

## Tier 2: Verification Tools

These tools check that code blocks in documentation match actual source files. They don't generate code; they verify consistency.

### danvk/literate-ts

**What it does**: Checks that TypeScript code blocks in Markdown files are type-correct and match the actual `.ts` files in the project.

**Rejection reason**: Not a tangle tool. `literate-ts` is a TypeScript-only verification tool. It checks that code blocks in Markdown match the actual `.ts` files but doesn't generate them. It's a useful complement to Entangled (run it in CI to verify that `.lit.md` files stay in sync with source), but it cannot replace Entangled. It satisfies requirement 1 partially (it reads code from docs) but not requirement 2 (bidirectional sync) and not the actual extraction step.

---

## Tier 3: Weave-Only Tools

These tools generate documentation from source code. They go in the opposite direction from what we need: source → docs, not docs → source.

### litscript

**What it does**: Generates beautiful HTML documentation from annotated TypeScript files. Produces a documentation website from `.ts` source with prose comments.

**Rejection reason**: Pure documentation generator (weave direction only). `litscript` does not extract code blocks from markdown. It reads `.ts` files and produces HTML. We need the reverse: read `.lit.md` files and produce `.ts` files. `litscript` is excellent at what it does, but what it does is the wrong direction.

### Docco

**What it does**: Generates side-by-side code and prose HTML documentation. The original "literate-style" documentation tool for JavaScript.

**Rejection reason**: CoffeeScript-era tool from 2010. JavaScript and CoffeeScript only — no TypeScript support. Generates documentation HTML from source files (weave direction), not code from prose (tangle direction). Unmaintained. Even if we accepted the maintenance risk and the lack of TypeScript support, it's still the wrong direction.

### renoun/mdxts

**What it does**: MDX-based documentation framework for React component libraries. Generates interactive documentation sites with live code examples.

**Rejection reason**: Wrong use case entirely. `mdxts` is for documenting React component libraries — it requires React and a server infrastructure (Next.js or similar). GridInstruments is a vanilla TypeScript single-page app with no React dependency. Adding React and a Next.js server just to get documentation tooling would be a larger architectural change than the LP system itself. Also weave-direction only: it generates docs from components, not code from docs.

### TypeDoc

**What it does**: Extracts JSDoc and TSDoc comments from TypeScript source files and generates API documentation.

**Rejection reason**: The opposite direction from what we need. TypeDoc reads `.ts` files and produces documentation. We want to read `.lit.md` files and produce `.ts` files. TypeDoc is excellent for API documentation, but it's not a literate programming tool. It also requires JSDoc/TSDoc annotations in the source, which is a different authoring model from prose-first LP.

### Fumadocs

**What it does**: Documentation website framework, similar to GitBook or Docusaurus. Builds a full Next.js documentation site from Markdown files.

**Rejection reason**: Not a code generation tool. Fumadocs builds documentation websites. It has no concept of extracting code blocks from Markdown into source files. It requires Next.js. It's in the same category as Docusaurus or GitBook — useful for documentation sites, irrelevant for literate programming.

---

## Tier 4: Notebook-First Paradigms

These tools are excellent for data science and interactive computation. They're wrong for a production web app.

### Quarto

**What it does**: Computational notebook system from Posit (formerly RStudio). Supports R, Python, Julia, and "TypeScript via Deno kernel."

**Rejection reason**: The TypeScript support is experimental and requires Deno. Our entire build pipeline — Vite, npm, 62 dynamic imports in the Playwright test suite — depends on npm. Switching to Deno is not a configuration change; it's a full ecosystem migration. Beyond the Deno incompatibility, Quarto's primary paradigm is documents with embedded computations (like Jupyter), not literate source code for production apps. The output is rendered documents, not importable ES modules.

### Observable

**What it does**: JavaScript/Observable-flavored reactive notebook environment. Cells are reactive: change one value and dependent cells recompute.

**Rejection reason**: The Observable reactive cell model is fundamentally incompatible with a TypeScript module system. Observable cells are not ES modules; they use a custom runtime with implicit reactivity. You cannot produce vanilla `.ts` files from Observable notebooks. Additionally, Observable requires either the Observable platform (cloud) or the Observable Runtime embedded in the browser. Neither fits a Vite-built static site. The language itself is "Observable JavaScript," not standard TypeScript.

### tslab

**What it does**: TypeScript Jupyter kernel. Run TypeScript interactively in Jupyter notebooks.

**Rejection reason**: Jupyter notebook model is incompatible with producing importable ES module source files. Jupyter notebooks are JSON files (`.ipynb`) with cell outputs embedded. They're not source files. `tslab` is useful for data science with TypeScript but cannot produce the `_generated/lib/keyboard-visualizer.ts` that Vite imports. It also requires Jupyter and the Python ecosystem, adding a Python dependency to a project that currently has none.

### Deno Jupyter

**What it does**: Deno's built-in Jupyter kernel. TypeScript in Jupyter notebooks, powered by Deno.

**Rejection reason**: Same Jupyter incompatibility as `tslab`. Additionally, using Deno Jupyter would require switching the entire project from npm to Deno — a migration that touches the Vite config, the Playwright test suite, the Nix devshell, and every import path. The test suite has 62 dynamic imports that assume npm module resolution. There is no migration path that doesn't break the existing build.

### nbdev

**What it does**: Jupyter Notebooks to Python modules pipeline, developed by fast.ai. The conceptual model is closest to what we want: write notebooks, export clean Python modules.

**Rejection reason**: Python-only. There is no TypeScript or JavaScript equivalent of `nbdev`. The tool is deeply integrated with the Python ecosystem (pip, conda, PyPI publishing). Conceptually, `nbdev` is the closest thing to what we want — prose-first development that produces clean source files — but it cannot produce TypeScript. If this project were Python, `nbdev` would be a serious contender.

---

## Tier 5: Not Viable

These tools were evaluated briefly and rejected quickly.

### Groc

**Rejection reason**: CoffeeScript annotation tool from 2012, abandoned. No TypeScript support, no tangle capability. Listed here for completeness.

### Marginalia

**Rejection reason**: Clojure literate programming tool. Language-specific to the Clojure ecosystem. Cannot produce TypeScript.

### iTypeScript

**Rejection reason**: Interactive TypeScript Jupyter kernel. Same Jupyter incompatibility as `tslab` and Deno Jupyter. The "interactive" in the name signals the use case: REPL-style exploration, not production source file generation.

### Markdoc

**Rejection reason**: Stripe's Markdown extension for documentation websites. Similar to MDX but with a different syntax. Not a code generation tool. Builds documentation sites, not source files.

### .litcoffee

**Rejection reason**: CoffeeScript had a built-in literate mode: files with the `.litcoffee` extension were treated as Markdown where code blocks were the actual CoffeeScript source. TypeScript has no equivalent built-in mechanism. This was evaluated as a concept — could we add similar support to `tsc`? — but it would require forking the TypeScript compiler. Not viable.

---

## The Decision

Entangled 2.4.2 is the only tool in this evaluation that satisfies all five requirements:

| Requirement | Entangled | Best alternative |
|---|---|---|
| Tangle (docs → source) | Yes | @thi.ng/tangle (unidirectional) |
| Bidirectional sync | Yes (stitch) | None |
| TypeScript support | Yes (configurable) | litscript (wrong direction) |
| Nix-compatible | Yes (pip install) | Most tools |
| No framework lock-in | Yes | Observable (requires runtime) |

The bidirectional sync is what makes Entangled viable for a project with an existing codebase and an existing test suite. We don't have to abandon IDE tooling or rewrite the Playwright tests. Developers can work in `.ts` files as they always have; `entangled stitch` keeps the `.lit.md` files current.

The LP + AI insight from March 2026 is what makes the investment worthwhile. The `.lit.md` files aren't just documentation — they're context for future AI assistance. When an agent reads `keyboard-visualizer.lit.md`, it reads the geometric reasoning behind the hexagonal grid, the decision to use Canvas 2D instead of WebGL, the tradeoff between hit detection accuracy and render performance. That context makes the agent's suggestions dramatically better than if it were reading the `.ts` file alone.

Entangled is the tool. The work begins here.
