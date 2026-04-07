{
  description = "gridinstruments — built with literate-state-machine-wiki";

  inputs = {
    nixpkgs.url = "nixpkgs";
    literate-state-machine-wiki.url = "github:zitongcharliedeng/build-state-machines-from-literate-wiki/lsmw-gridinstruments-verify-gate-20260316";
  };

  outputs = { self, nixpkgs, literate-state-machine-wiki }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      lsmwOutputs = literate-state-machine-wiki.lib.init {
        inherit pkgs;
        src = ./.;
        sourceDir = "literate.lit.mdx";
        minProseLines = 1;
        maxBlockLength = 200;

        postTangle = [
          {
            name = "deps";
            description = "Install dependencies via bun (replaces npm — no IFD, no importNpmLock)";
            command = ''
              bun install --frozen-lockfile 2>/dev/null || bun install
            '';
            nativeBuildInputs = [ pkgs.bun ];
          }
          {
            name = "typescript-eslint";
            description = "TypeScript type check + ESLint on tangled output";
            command = ''
              bunx tsc --noEmit
              bunx eslint .
            '';
            nativeBuildInputs = [ pkgs.bun ];
          }
          {
            name = "ast-grep";
            description = "Structural lint rules";
            command = ''ast-grep scan --config sgconfig.yml'';
            nativeBuildInputs = [ pkgs.ast-grep ];
            mode = "warn";
          }
          {
            name = "vite-build";
            description = "Build production bundle from verified tangled output";
            command = ''
              bunx vite build
            '';
            nativeBuildInputs = [ pkgs.bun ];
          }
        ];

      };
    in
      lsmwOutputs // {
        devShells.${system}.default = pkgs.mkShell {
          inputsFrom = [ lsmwOutputs.devShells.${system}.default ];
          packages = [ pkgs.bun pkgs.nodejs_22 pkgs.python313 ];
          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            export PLAYWRIGHT_NODEJS_PATH=${pkgs.nodejs_22}/bin/node
            echo "[gridinstruments] dev shell ready (lsmw + playwright)"
          '';
        };
      };
}
