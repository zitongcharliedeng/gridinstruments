{
  description = "gridinstruments — built with literate-state-machine-wiki";

  inputs = {
    nixpkgs.url = "nixpkgs";
    literate-state-machine-wiki.url = "github:zitongcharliedeng/build-state-machines-from-literate-wiki/lsmw-gridinstruments-verify-gate-20260316";
    bun2nix.url = "github:nix-community/bun2nix";
    bun2nix.inputs.nixpkgs.follows = "nixpkgs";
  };

  nixConfig = {
    extra-substituters = [
      "https://cache.nixos.org"
      "https://nix-community.cachix.org"
    ];
    extra-trusted-public-keys = [
      "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

  outputs = { self, nixpkgs, literate-state-machine-wiki, bun2nix }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      # bun2nix package — exposes fetchBunDeps and hook via passthru
      bunPkg = bun2nix.packages.${system}.default;

      # bun deps: package.json emerges from literate source via tangleAndRead;
      # bun.lock and bun.nix are committed artifacts (like flake.lock — generated, not literate)
      bunDeps = bunPkg.fetchBunDeps {
        bunNix = ./literate.lit.mdx/bun.nix;
      };

      # Pre-built node_modules tree — symlinked into postTangle derivations
      # Uses bun2nix hook which runs bun install against the pre-fetched cache.
      # src = literate.lit.mdx directory which contains package.json + bun.lock
      # (both are committed artifacts, not literate source).
      bunNodeModules = pkgs.stdenv.mkDerivation {
        name = "gridinstruments-bun-node-modules";
        src = ./literate.lit.mdx;
        nativeBuildInputs = [ bunPkg.hook ];
        inherit bunDeps;
        dontUseBunBuild = true;
        dontUseBunCheck = true;
        dontUseBunInstall = true;
        dontRunLifecycleScripts = true;
        buildPhase = ''
          mkdir -p $out
          cp -r node_modules $out/
        '';
        installPhase = "true";
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
              ln -s ${bunNodeModules}/node_modules ./node_modules
              export PATH="${bunNodeModules}/node_modules/.bin:$PATH"
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
              export PATH="${bunNodeModules}/node_modules/.bin:$PATH"
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
          packages = [ pkgs.nodejs_22 pkgs.python313 pkgs.bun ];
          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            export PLAYWRIGHT_NODEJS_PATH=${pkgs.nodejs_22}/bin/node
            echo "[gridinstruments] dev shell ready (lsmw + playwright)"
          '';
        };
      };
}
