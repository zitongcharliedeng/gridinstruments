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

      # npm deps: package.json form emerges from literate source via tangleAndRead
      # package-lock.json is a committed lockfile (like flake.lock — auto-generated, not literate)
      npmDeps = pkgs.importNpmLock.buildNodeModules {
        package = builtins.fromJSON (literate-state-machine-wiki.lib.tangleAndRead {
          inherit pkgs; src = ./literate.lit.mdx; file = "package.json";
        });
        packageLock = builtins.fromJSON (builtins.readFile ./literate.lit.mdx/package-lock.json);
        nodejs = pkgs.nodejs_22;
        derivationArgs.NPM_CONFIG_LEGACY_PEER_DEPS = "true";
      };

      lsmwOutputs = literate-state-machine-wiki.lib.init {
        inherit pkgs;
        src = ./.;
        sourceDir = "literate.lit.mdx";
        minProseLines = 1;
        maxBlockLength = 200;

        # Stage 3: Linters — check the code dialect is literate too
        postTangle = [
          {
            name = "typescript-eslint";
            description = "TypeScript type check + ESLint on tangled output";
            command = ''
              rm -rf node_modules
              ln -s ${npmDeps}/node_modules ./node_modules
              export PATH="${npmDeps}/node_modules/.bin:$PATH"
              tsc --noEmit
              eslint .
            '';
            nativeBuildInputs = [ pkgs.nodejs_22 ];
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
              export PATH="${npmDeps}/node_modules/.bin:$PATH"
              vite build
            '';
            nativeBuildInputs = [ pkgs.nodejs_22 ];
          }
        ];

      };
    in
      lsmwOutputs // {
        devShells.${system}.default = pkgs.mkShell {
          inputsFrom = [ lsmwOutputs.devShells.${system}.default ];
          packages = [ pkgs.nodejs_22 pkgs.python313 ];
          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            export PLAYWRIGHT_NODEJS_PATH=${pkgs.nodejs_22}/bin/node
            echo "[gridinstruments] dev shell ready (lsmw + playwright)"
          '';
        };
      };
}
