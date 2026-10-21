import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
await build({
  entryPoints: [resolve(root, "demos/demon-king.ts")],
  outfile: resolve(root, "static/games/demon-king/game.js"),
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  alias: {
    "@five-days/protocol": resolve(root, "demos/vendor/protocol/index.ts"),
  },
  legalComments: "eof",
});
console.log("Built offline RPG demo from vendored GameProject2 GameCore.");
