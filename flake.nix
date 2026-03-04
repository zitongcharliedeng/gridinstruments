{
  description = "dcompose-web dev shell — Playwright Firefox via nixpkgs (no system libs)";

  inputs.nixpkgs.url = "nixpkgs";  # resolved via flake registry → system-cached nixpkgs

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs   = nixpkgs.legacyPackages.${system};
    in {
      devShells.${system}.default = pkgs.mkShell {
        # Only tools needed for testing — project uses its own node_modules
        packages = [ pkgs.nodejs_22 ];

        shellHook = ''
          # Point playwright to nixpkgs-provided browser binaries (NixOS-patched)
          export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
          export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
          export PLAYWRIGHT_NODEJS_PATH=${pkgs.nodejs_22}/bin/node
          echo "[devshell] PLAYWRIGHT_BROWSERS_PATH=$PLAYWRIGHT_BROWSERS_PATH"
          echo "[devshell] Firefox: $(ls $PLAYWRIGHT_BROWSERS_PATH/ | grep firefox)"
        '';
      };
    };
}
