{
  description = "dcompose-web dev shell — Playwright Firefox via nixpkgs (no system libs)";

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
        sourceDir = "literate";
        forbidTsComments = true;
        tooltipCheckFile = "literate/index.lit.md";
        warnLongBlocks = true;
      };
      lsmwChecks = lsmw.lib.makeChecks {
        inherit pkgs;
        src = ./.;
        entangledConfig = ./entangled.toml;
        preTangleChecks = [
          {
            name = "literate-comments";
            command = ''
              violations=$(grep -rn '^\s*\(//\|/\*\|\*/\)' literate/ --include='*.lit.md' | grep -v 'http://' | grep -v 'https://' | wc -l || true)
              if [ "$violations" -gt 0 ]; then
                echo "[lsmw] ERROR: $violations comment violations in literate code blocks."
                grep -rn '^\s*\(//\|/\*\|\*/\)' literate/ --include='*.lit.md' | grep -v 'http://' | grep -v 'https://' | head -20
                exit 1
              fi
            '';
          }
          {
            name = "input-title-tooltips";
            command = ''
              if grep -q '<input[^>]*title="' literate/index.lit.md 2>/dev/null; then
                echo "[lsmw] ERROR: <input> elements with title= tooltips found. Use info button + dialog instead."
                grep -n '<input[^>]*title="' literate/index.lit.md | head -10
                exit 1
              fi
            '';
          }
        ];
        postTangleChecks = [ ];
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
