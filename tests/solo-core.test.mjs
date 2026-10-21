import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtemp, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = await mkdtemp(resolve(tmpdir(), "portfolio-solo-"));
const bundle = resolve(temporary, "session.mjs");
await build({
  entryPoints: [resolve(root, "demos/solo-session.ts")],
  outfile: bundle,
  bundle: true,
  platform: "node",
  format: "esm",
  alias: {
    "@five-days/protocol": resolve(root, "demos/vendor/protocol/index.ts"),
  },
});
const { createSoloGame, applySoloInput, LOCAL_USER, STEP, nearestInteraction } =
  await import(pathToFileURL(bundle).href);
test.after(async () => {
  await rm(bundle);
  await rmdir(temporary);
});

test("all classes start on the official 48-room map with two different AI partners", () => {
  for (const hero of ["swordsman", "archer", "mage"]) {
    const core = createSoloGame(hero);
    assert.equal(core.phase, "day");
    assert.equal(core.rooms.size, 48);
    assert.equal(core.players.size, 3);
    assert.equal(core.players.get(LOCAL_USER).heroClass, hero);
    assert.deepEqual(
      [...core.players.values()].map((p) => p.heroClass).sort(),
      ["archer", "mage", "swordsman"],
    );
    assert.deepEqual(
      [...core.players.values()]
        .filter((p) => p.aiRole)
        .map((p) => p.aiRole)
        .sort(),
      ["defender", "follower"],
    );
  }
});

test("actual fixed-step input moves the player and Space triggers the core dash", () => {
  const core = createSoloGame();
  const player = core.players.get(LOCAL_USER);
  const x = player.x;
  for (let i = 0; i < 10; i++) {
    applySoloInput(core, new Set(["d"]), 0, i);
    core.update(STEP);
  }
  assert.ok(player.x > x, "WASD must move the real core actor");
  applySoloInput(core, new Set([" "]), 0, 11);
  assert.ok(
    player.dashCooldown > 0,
    "Space must reach bit 4 in the original game core",
  );
});

test("same seed and input produce the same game state without network or DB", () => {
  const games = [
    createSoloGame("mage", "fixed-seed"),
    createSoloGame("mage", "fixed-seed"),
  ];
  for (const core of games)
    for (let i = 0; i < 120; i++) {
      applySoloInput(core, new Set(i < 30 ? ["d"] : []), 0.2, i);
      core.update(STEP);
      core.takeCombatActionEvents();
    }
  assert.deepEqual(
    [...games[0].players.values()],
    [...games[1].players.values()],
  );
  assert.equal(games[0].elapsed, games[1].elapsed);
});

test("F on a checkpoint starts its canonical three-second return to base", () => {
  const core = createSoloGame();
  const player = core.players.get(LOCAL_USER);
  const source = [...core.waypoints.values()].find(
    (w) => w.kind === "checkpoint",
  );
  assert.ok(source);
  source.active = true;
  player.roomId = source.roomId;
  player.x = source.x;
  player.y = source.y;
  assert.equal(nearestInteraction(core, player), true);
  assert.equal(core.activeTravel.destinationId, source.destinationId);
});
