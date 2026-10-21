import {
  GameCore,
  OFFICIAL_WORLD,
  type CorePlayer,
} from "./vendor/game-core/index";
import { PROTOCOL_VERSION, type HeroClassId } from "./vendor/protocol/index";

export const LOCAL_USER = "portfolio-player";
export const STEP = 1 / 60;

export function createSoloGame(
  heroClass: HeroClassId = "swordsman",
  seed = "portfolio-solo-v1",
): GameCore {
  const core = new GameCore({
    mode: "prototype",
    difficulty: "normal",
    seed,
    minimumPlayers: 3,
    balancePartySize: 3,
    maxLiveInvaders: 15,
    world: OFFICIAL_WORLD,
  });
  const classes = ["swordsman", "archer", "mage"] as const;
  core.addPlayer({ userId: LOCAL_USER, displayName: "나", heroClass });
  const partners = classes.filter((value) => value !== heroClass);
  core.addPlayer({
    userId: "ai:defender",
    displayName: "베이스 수비",
    heroClass: partners[0],
  });
  core.addPlayer({
    userId: "ai:follower",
    displayName: "탐험 동료",
    heroClass: partners[1],
  });
  for (const player of core.players.values())
    core.setReady(player.userId, true);
  return core;
}

export function inputForKeys(keys: ReadonlySet<string>, aim: number) {
  return {
    x:
      Number(keys.has("d") || keys.has("arrowright")) -
      Number(keys.has("a") || keys.has("arrowleft")),
    y:
      Number(keys.has("s") || keys.has("arrowdown")) -
      Number(keys.has("w") || keys.has("arrowup")),
    aim,
    buttons:
      Number(keys.has("q")) |
      (Number(keys.has("e")) << 1) |
      (Number(keys.has(" ")) << 2),
  };
}

export function applySoloInput(
  core: GameCore,
  keys: ReadonlySet<string>,
  aim: number,
  sequence: number,
) {
  return core.applyInput(LOCAL_USER, {
    v: PROTOCOL_VERSION,
    type: "player.input",
    seq: sequence,
    clientTime: core.elapsed * 1000,
    payload: inputForKeys(keys, aim),
  });
}

export function nearestInteraction(
  core: GameCore,
  player: CorePlayer,
): boolean {
  const drops = [...core.drops.values()]
    .filter((drop) => !drop.claimed)
    .sort(
      (a, b) =>
        Math.hypot(a.x - player.x, a.y - player.y) -
        Math.hypot(b.x - player.x, b.y - player.y),
    );
  if (
    drops[0] &&
    Math.hypot(drops[0].x - player.x, drops[0].y - player.y) < 150
  )
    return core.equipDrop(LOCAL_USER, drops[0].id);
  if (core.claimShrine(LOCAL_USER)) return true;
  const waypoint = [...core.waypoints.values()].find(
    (point) =>
      point.roomId === player.roomId &&
      Math.hypot(point.x - player.x, point.y - player.y) <= 92,
  );
  return waypoint ? core.interact(LOCAL_USER, waypoint.id) : false;
}
