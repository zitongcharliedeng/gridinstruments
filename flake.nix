{
  description = "gridinstruments — built with literate-state-machine-wiki";

  inputs = {
    nixpkgs.url = "nixpkgs";
    literate-state-machine-wiki.url = "path:/home/firstinstallusername/literate-state-machine-wiki";
  };

  outputs = { self, nixpkgs, literate-state-machine-wiki }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};

      # Consumer-side npm dependency resolution — the library doesn't know about npm
      npmDeps = pkgs.importNpmLock.buildNodeModules {
        npmRoot = ./.;
        nodejs = pkgs.nodejs_22;
        derivationArgs.NPM_CONFIG_LEGACY_PEER_DEPS = "true";
      };

      lsmwOutputs = literate-state-machine-wiki.lib.init {
        inherit pkgs;
        src = ./.;
        sourceDir = "literate.lit.mdx";
        minProseLines = 1;
        maxBlockLength = 100;

        # Stage 3: Linters — consumer bundles npm-dependent checks together
        linters = [
          {
            name = "typescript-eslint";
            description = "TypeScript type check + ESLint on tangled output";
            mode = "warn";
            command = ''
              ln -s ${npmDeps}/node_modules ./node_modules
              export PATH="${npmDeps}/node_modules/.bin:$PATH"
              tsc --noEmit
              eslint _generated/
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
        ];

        tests = [ ];
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
