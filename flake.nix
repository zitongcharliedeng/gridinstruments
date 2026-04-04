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

      lsmwOutputs = literate-state-machine-wiki.lib.init {
        inherit pkgs;
        src = ./.;
        sourceDir = "literate.lit.mdx";
        linters = [ ];
        tests = [ ];
        minProseLines = 1;
        maxBlockLength = 100;
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
