{
  description = "gridinstruments dev shell — Playwright Firefox via nixpkgs";

  inputs = {
    nixpkgs.url = "nixpkgs";  # resolved via flake registry → system-cached nixpkgs
    lsmw.url = "github:zitongcharliedeng/build-state-machines-from-literate-wiki/lsmw-gridinstruments-verify-gate-20260316";
  };

  outputs = { self, nixpkgs, lsmw }:
    let
      system = "x86_64-linux";
      pkgs   = nixpkgs.legacyPackages.${system};
      lsmwTangle = lsmw.lib.mkLocalTangleApp {
        inherit pkgs;
        name = "gridinstruments-tangle";
      };
      lsmwChecks = lsmw.lib.makeChecks {
        inherit pkgs;
        src = ./.;
        entangledConfig = ./entangled.toml;
      };
    in {
      checks.${system} = lsmwChecks // {
        verify-lsmw = lsmwChecks.verify;
      };

      packages.${system}.tangle = lsmwTangle;

      apps.${system}.tangle = {
        type = "app";
        program = "${lsmwTangle}/bin/gridinstruments-tangle";
      };

      devShells.${system}.default = lsmw.lib.mkDevShell {
        inherit pkgs;
        basePackages = [ pkgs.nodejs_22 pkgs.python313 ];
        extraPackages = [ pkgs.playwright-driver ];
        env = {
          PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
          PLAYWRIGHT_NODEJS_PATH = "${pkgs.nodejs_22}/bin/node";
        };
        tangleCommand = ''${lsmwTangle}/bin/gridinstruments-tangle'';
        shellHook = ''
          echo "[devshell] PLAYWRIGHT_BROWSERS_PATH=$PLAYWRIGHT_BROWSERS_PATH"
          echo "[devshell] Firefox: $(ls "$PLAYWRIGHT_BROWSERS_PATH/" | grep firefox)"
        '';
      };
    };
}
