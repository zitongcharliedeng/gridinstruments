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
    in
      (literate-state-machine-wiki.lib.init {
        inherit pkgs;
        src = ./.;
        sourceDir = "literate.lit.mdx";
        minProseLines = 1;
        maxBlockLength = 100;
      }) // {
        devShells.${system}.default = pkgs.mkShell {
          packages = [ pkgs.nodejs_22 pkgs.python313 ];
          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            export PLAYWRIGHT_NODEJS_PATH=${pkgs.nodejs_22}/bin/node
            echo "[gridinstruments] Playwright ready. Use: nix flake check"
          '';
        };
      };
}
