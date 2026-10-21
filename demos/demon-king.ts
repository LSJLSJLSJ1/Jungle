import {
  OFFICIAL_WORLD,
  type GameCore,
  type CorePlayer,
  type CoreEnemy,
} from "./vendor/game-core/index";
import {
  createSoloGame,
  applySoloInput,
  LOCAL_USER,
  STEP,
  nearestInteraction,
} from "./solo-session";
import type { HeroClassId, CombatActionEvent } from "./vendor/protocol/index";

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>("world");
const ctx = canvas.getContext("2d")!;
const minimap = $<HTMLCanvasElement>("minimap");
const mapCtx = minimap.getContext("2d")!;
const keys = new Set<string>();
const heroNames = { swordsman: "검사", archer: "궁수", mage: "마법사" };
const roomNames: Record<string, string> = {
  start: "베이스",
  empty: "탐험 지역",
  resource: "장비 보급",
  "static-monster": "몬스터 방",
  "hidden-monster": "숨겨진 적",
  gate: "게이트",
  boss: "마왕의 방",
  "gate-candidate": "탐험 지역",
  shrine: "신전",
  trap: "함정",
  checkpoint: "체크포인트",
  altar: "제단",
};
let core: GameCore | null = null;
let paused = false;
let previousTime = 0;
let accumulated = 0;
let sequence = 0;
let camera = { x: 0, y: 0, scale: 1 };
let aim = 0;
let frame = 0;
let hudElapsed = 0;
let draftId = "";
let inventoryKey = "";
let waypointKey = "";
let effects: Array<CombatActionEvent & { remaining: number }> = [];
let noticeUntil = 0;
const sprites: Record<string, HTMLImageElement> = {};
const textures = new Map<string, CanvasPattern>();
const assetFiles = {
  swordsman: "WarriorSprite.png",
  archer: "ArcherSprite.png",
  mage: "MageSprite-v2.png",
  enemy1: "goblin-unarmed-8dir-walk-v1.png",
  enemy2: "skeleton-unarmed-8dir-walk-v1.png",
  enemy3: "demon-unarmed-8dir-walk-v1.png",
  base: "base.png",
  waypoint1: "waypoint-1.png",
  waypoint2: "waypoint-2.png",
  waypoint3: "waypoint-3.png",
  terrain1: "terrain-1.png",
  terrain2: "terrain-2.png",
  terrain3: "terrain-3.png",
  shrine: "echo-shrine.webp",
  trap: "trap-device.webp",
  checkpoint: "checkpoint-runestone.webp",
  altar: "blood-altar.webp",
  boss: "boss.png",
};
for (const [id, file] of Object.entries(assetFiles)) {
  const image = new Image();
  image.src = new URL(`./assets/${file}`, import.meta.url).href;
  sprites[id] = image;
}

function showNotice(message: string) {
  $("notice").textContent = message;
  noticeUntil = performance.now() + 5000;
}

function start(heroClass: HeroClassId) {
  core = createSoloGame(heroClass);
  sequence = 0;
  accumulated = 0;
  previousTime = 0;
  hudElapsed = 0;
  draftId = "";
  inventoryKey = "";
  waypointKey = "";
  effects = [];
  keys.clear();
  paused = false;
  $("start-panel").hidden = true;
  $("result-panel").hidden = true;
  $("pause-panel").hidden = true;
  $<HTMLButtonElement>("pause").disabled = false;
  $("pause").textContent = "일시정지";
  canvas.dataset.phase = core.phase;
  const url = new URL(location.href);
  url.searchParams.set("class", heroClass);
  history.replaceState(null, "", url);
  canvas.focus({ preventScroll: true });
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  updateHud();
  showNotice("WASD로 탐험하세요. 일반 공격은 자동으로 나갑니다.");
}

function setPaused(value: boolean, focus = true) {
  if (!core || core.phase === "ended") return;
  paused = value;
  keys.clear();
  accumulated = 0;
  previousTime = 0;
  $("pause-panel").hidden = !value;
  $("pause").textContent = value ? "계속하기" : "일시정지";
  canvas.dataset.paused = String(value);
  if (focus) (value ? $("resume") : canvas).focus({ preventScroll: true });
  draw();
}

$("start-form").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    start($<HTMLSelectElement>("hero-class").value as HeroClassId);
  } catch (error) {
    $("game-error").hidden = false;
    console.error(error);
  }
});
$("restart").addEventListener("click", () =>
  start($<HTMLSelectElement>("hero-class").value as HeroClassId),
);
$("pause").addEventListener("click", () => setPaused(!paused));
$("resume").addEventListener("click", () => setPaused(false));
const initialClass = new URLSearchParams(location.search).get("class");
if (initialClass && initialClass in heroNames)
  $<HTMLSelectElement>("hero-class").value = initialClass;
window.addEventListener("keydown", (event) => {
  if (
    !core ||
    core.phase === "ended" ||
    event.target instanceof HTMLSelectElement
  )
    return;
  const key = event.key.toLowerCase();
  if (key === "escape") {
    event.preventDefault();
    if (!event.repeat) setPaused(!paused);
    return;
  }
  if (document.activeElement !== canvas || paused) return;
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key))
    event.preventDefault();
  keys.add(key);
  if (event.repeat) return;
  if (key === "b")
    showNotice(
      core.recall(LOCAL_USER)
        ? "3초 동안 웨이포인트 안에서 기다리면 귀환합니다."
        : "발견한 웨이포인트 위에서 B를 누르세요.",
    );
  if (key === "f") {
    const player = core.players.get(LOCAL_USER)!;
    if (core.rooms.get(player.roomId)?.kind === "altar") {
      showNotice(
        core.rerollAltar(LOCAL_USER)
          ? "제단 효과를 적용했습니다."
          : "제단 중앙에서 다시 시도하세요.",
      );
    } else
      showNotice(
        nearestInteraction(core, player)
          ? "상호작용했습니다. 이동은 웨이포인트 위에서 3초 기다리세요."
          : "장비·신전·웨이포인트 가까이에서 F를 누르세요.",
      );
  }
});
window.addEventListener("keyup", (event) =>
  keys.delete(event.key.toLowerCase()),
);
window.addEventListener("blur", () => {
  if (core && !paused) setPaused(true, false);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (core && !paused) setPaused(true, false);
    cancelAnimationFrame(frame);
  } else {
    previousTime = 0;
    frame = requestAnimationFrame(loop);
  }
});
canvas.addEventListener("pointerdown", () => canvas.focus({ preventScroll: true }));
canvas.addEventListener("pointermove", (event) => {
  if (!core) return;
  const bounds = canvas.getBoundingClientRect();
  const scale = Math.min(
    bounds.width / canvas.width,
    bounds.height / canvas.height,
  );
  const offsetX = (bounds.width - canvas.width * scale) / 2;
  const offsetY = (bounds.height - canvas.height * scale) / 2;
  const x = (event.clientX - bounds.left - offsetX) / scale;
  const y = (event.clientY - bounds.top - offsetY) / scale;
  aim = Math.atan2(y - canvas.height / 2, x - canvas.width / 2);
});
function point(x: number, y: number) {
  return {
    x: (x - camera.x) * camera.scale + canvas.width / 2,
    y: (y - camera.y) * camera.scale + canvas.height / 2,
  };
}
function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke?: string,
) {
  const p = point(x, y);
  if (
    p.x + w * camera.scale < 0 ||
    p.y + h * camera.scale < 0 ||
    p.x > canvas.width ||
    p.y > canvas.height
  )
    return;
  ctx.fillStyle = fill;
  ctx.fillRect(p.x, p.y, w * camera.scale, h * camera.scale);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, w * camera.scale, h * camera.scale);
  }
}
function circle(x: number, y: number, r: number, color: string) {
  const p = point(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * camera.scale, 0, Math.PI * 2);
  ctx.fill();
}
function label(
  text: string,
  x: number,
  y: number,
  color = "#d9e5d6",
  size = 16,
) {
  const p = point(x, y);
  ctx.font = `600 ${size}px PortfolioSans, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(text, p.x, p.y);
}
function drawImage(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const image = sprites[id];
  if (!image?.complete || !image.naturalWidth) return;
  const p = point(x, y);
  ctx.drawImage(
    image,
    p.x - (width * camera.scale) / 2,
    p.y - height * camera.scale,
    width * camera.scale,
    height * camera.scale,
  );
}
function terrain(
  zone: number,
  x: number,
  y: number,
  width: number,
  height: number,
  corridor = false,
) {
  const p = point(x, y);
  if (
    p.x + width * camera.scale < 0 ||
    p.y + height * camera.scale < 0 ||
    p.x > canvas.width ||
    p.y > canvas.height
  )
    return;
  const image = sprites[`terrain${zone}`];
  if (!image?.complete || !image.naturalWidth) return;
  const key = `${zone}:${corridor}`;
  if (!textures.has(key)) {
    const tile = document.createElement("canvas");
    tile.width = image.naturalWidth / 2;
    tile.height = image.naturalHeight / 2;
    tile
      .getContext("2d")!
      .drawImage(
        image,
        corridor ? tile.width : 0,
        corridor ? tile.height : 0,
        tile.width,
        tile.height,
        0,
        0,
        tile.width,
        tile.height,
      );
    const pattern = ctx.createPattern(tile, "repeat");
    if (pattern) textures.set(key, pattern);
  }
  const pattern = textures.get(key);
  if (!pattern) return;
  ctx.save();
  ctx.setTransform(
    camera.scale,
    0,
    0,
    camera.scale,
    canvas.width / 2 - camera.x * camera.scale,
    canvas.height / 2 - camera.y * camera.scale,
  );
  ctx.fillStyle = pattern;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#10171135";
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}
function hero(player: CorePlayer, time: number) {
  const image = sprites[player.heroClass];
  const p = point(player.x, player.y);
  circle(
    player.x,
    player.y + 4,
    player.userId === LOCAL_USER ? 19 : 16,
    player.userId === LOCAL_USER ? "#bad7d6" : "#8faca2",
  );
  if (image?.complete && image.naturalWidth) {
    const facing =
      Math.abs(player.inputX) > Math.abs(player.inputY)
        ? player.inputX > 0
          ? 1
          : 3
        : player.inputY < 0
          ? 2
          : 0;
    const row =
      player.inputX || player.inputY
        ? [1, 0, 2, 0][Math.floor(time / 140) % 4]
        : 0;
    const size = 100 * camera.scale;
    ctx.globalAlpha = player.alive ? 1 : 0.35;
    ctx.drawImage(
      image,
      facing * 362,
      row * 362,
      362,
      362,
      p.x - size / 2,
      p.y - size + 15,
      size,
      size,
    );
    ctx.globalAlpha = 1;
  }
  label(
    player.userId === LOCAL_USER
      ? heroNames[player.heroClass]
      : player.displayName,
    player.x,
    player.y - 80,
    "#e7f1e5",
    13,
  );
  rect(player.x - 24, player.y - 65, 48, 4, "#1a2421");
  rect(
    player.x - 24,
    player.y - 65,
    48 * Math.max(0, player.hp / player.maxHp),
    4,
    "#a9c9b3",
  );
  if (!player.alive)
    label(
      `${Math.ceil(player.respawnRemaining)}초 후 부활`,
      player.x,
      player.y + 36,
    );
}
function enemy(entity: CoreEnemy, time: number) {
  if (
    !core ||
    !entity.alive ||
    (!core.discoveredRooms.has(entity.roomId) &&
      !core.activatedEnemyRooms.has(entity.roomId))
  )
    return;
  const p = point(entity.x, entity.y);
  if (
    p.x < -150 ||
    p.x > canvas.width + 150 ||
    p.y < -150 ||
    p.y > canvas.height + 150
  )
    return;
  const zone = core.rooms.get(entity.roomId)?.zone ?? 1;
  if (entity.kind === "gate") {
    rect(entity.x - 28, entity.y - 60, 56, 80, "#67333b", "#b65e69");
    label("게이트", entity.x, entity.y - 76, "#f0b6b4", 14);
  } else if (entity.kind === "boss") {
    drawImage("boss", entity.x, entity.y + 35, 220, 220);
  } else {
    const image = sprites[`enemy${zone}`];
    const size = (entity.kind === "hidden" ? 95 : 72) * camera.scale;
    circle(entity.x, entity.y + 2, 16, "#8e4d45");
    if (image?.complete && image.naturalWidth) {
      const target = core.players.get(entity.targetId ?? LOCAL_USER)!;
      const angle = Math.atan2(
        (target?.y ?? 0) - entity.y,
        (target?.x ?? 0) - entity.x,
      );
      const direction = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
      ctx.drawImage(
        image,
        (Math.floor(time / 110) % 8) * 160,
        direction * 160,
        160,
        160,
        p.x - size / 2,
        p.y - size + 15,
        size,
        size,
      );
    }
    if (entity.patternPhase === "telegraph") {
      ctx.strokeStyle = "#dc9b75";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, entity.attackRange * camera.scale, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  rect(
    entity.x - 22,
    entity.y - (entity.kind === "gate" ? 70 : 56),
    44,
    4,
    "#321c20",
  );
  rect(
    entity.x - 22,
    entity.y - (entity.kind === "gate" ? 70 : 56),
    44 * Math.max(0, entity.hp / entity.maxHp),
    4,
    "#e8a393",
  );
}
function draw(time = performance.now()) {
  ctx.fillStyle = "#101711";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!core) return;
  const player = core.players.get(LOCAL_USER)!;
  camera = {
    x: player.x,
    y: player.y,
    scale: Math.min(canvas.width / 1500, canvas.height / 900),
  };
  for (const floor of OFFICIAL_WORLD.walkable) {
    rect(floor.x, floor.y, floor.width, floor.height, "#263a2d");
    terrain(
      core.currentZone,
      floor.x,
      floor.y,
      floor.width,
      floor.height,
      true,
    );
  }
  for (const room of core.rooms.values()) {
    if (!room.rect) continue;
    const { x, y, width, height } = room.rect;
    const color =
      room.zone === 1 ? "#344c3a" : room.zone === 2 ? "#344547" : "#4d3e36";
    rect(x + 4, y + 4, width - 8, height - 8, color);
    terrain(room.zone, x + 4, y + 4, width - 8, height - 8);
    if (core.discoveredRooms.has(room.id))
      label(
        roomNames[room.kind] ?? room.kind,
        x + width / 2,
        y + 36,
        "#b8c9ba",
        14,
      );
    if (room.kind === "start")
      drawImage("base", x + width / 2, y + height / 2 + 28, 220, 146);
    if (["shrine", "altar", "trap", "checkpoint"].includes(room.kind)) {
      drawImage(room.kind, x + width / 2, y + height / 2 + 40, 120, 120);
      label("F", x + width / 2, y + height / 2 + 64, "#fff", 18);
    }
  }
  for (const connection of OFFICIAL_WORLD.connections) {
    const door = [...core.doors.values()].find(
      (door) =>
        (door.fromRoomId === connection.from &&
          door.toRoomId === connection.to) ||
        (door.toRoomId === connection.from &&
          door.fromRoomId === connection.to),
    );
    if (door?.locked && connection.lockBarrier) {
      const b = connection.lockBarrier;
      rect(b.x, b.y, b.width, b.height, "#77534a");
    }
  }
  for (const waypoint of core.waypoints.values()) {
    if (!core.discoveredRooms.has(waypoint.roomId)) continue;
    drawImage(`waypoint${waypoint.zone}`, waypoint.x, waypoint.y + 40, 80, 80);
  }
  for (const drop of core.drops.values())
    if (!drop.claimed && drop.ownerPlayerId === LOCAL_USER) {
      circle(drop.x, drop.y, 12, "#e4c785");
      label("F 장비", drop.x, drop.y - 18, "#eddfb3", 13);
    }
  const actors = [...core.players.values(), ...core.enemies.values()].sort(
    (a, b) => a.y - b.y,
  );
  for (const actor of actors)
    "heroClass" in actor ? hero(actor, time) : enemy(actor, time);
  for (const effect of effects) {
    const a = point(effect.startX, effect.startY),
      b = point(effect.targetX, effect.targetY);
    ctx.globalAlpha = Math.max(0, effect.remaining / 0.25);
    ctx.strokeStyle = effect.attackerType === "player" ? "#e4d5a3" : "#e7957e";
    ctx.lineWidth = effect.critical ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y - 12);
    ctx.lineTo(b.x, b.y - 12);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (core.activeTravel)
    label(
      `이동 중 ${Math.ceil(Math.max(0, 3 - core.activeTravel.elapsed))}`,
      player.x,
      player.y + 60,
      "#e5dfaf",
      18,
    );
  const cooldown = player.dashCooldown;
  ctx.fillStyle = "#10171ce0";
  ctx.fillRect(24, canvas.height - 52, 420, 32);
  ctx.fillStyle = "#dfe9e0";
  ctx.font = "14px PortfolioSans, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(
    `Q ${player.qCooldown > 0 ? player.qCooldown.toFixed(1) + "s" : "준비"}     E ${player.eCooldown > 0 ? player.eCooldown.toFixed(1) + "s" : "준비"}     대시 ${cooldown > 0 ? cooldown.toFixed(1) + "s" : "준비"}`,
    36,
    canvas.height - 31,
  );
}
function drawMap() {
  if (!core) return;
  const bounds = OFFICIAL_WORLD.bounds;
  const scale = Math.min(
    (minimap.width - 20) / bounds.width,
    (minimap.height - 20) / bounds.height,
  );
  const offsetX = (minimap.width - bounds.width * scale) / 2,
    offsetY = (minimap.height - bounds.height * scale) / 2;
  mapCtx.fillStyle = "#172127";
  mapCtx.fillRect(0, 0, minimap.width, minimap.height);
  for (const room of core.rooms.values()) {
    if (!room.rect) continue;
    const r = room.rect;
    mapCtx.fillStyle = !room.discovered
      ? "#34434b"
      : room.kind === "gate"
        ? "#cc7e76"
        : room.kind === "start"
          ? "#e2c98d"
          : "#9bbab1";
    mapCtx.fillRect(
      offsetX + r.x * scale,
      offsetY + r.y * scale,
      Math.max(3, r.width * scale - 1),
      Math.max(3, r.height * scale - 1),
    );
  }
  for (const player of core.players.values()) {
    mapCtx.fillStyle = player.userId === LOCAL_USER ? "#fff" : "#a9c4e4";
    mapCtx.beginPath();
    mapCtx.arc(
      offsetX + player.x * scale,
      offsetY + player.y * scale,
      3,
      0,
      Math.PI * 2,
    );
    mapCtx.fill();
  }
}
function updateHud() {
  if (!core) return;
  const player = core.players.get(LOCAL_USER)!;
  $("phase-label").textContent =
    `${core.day}일차 ${core.phase === "day" ? "낮" : core.phase === "night" ? "밤" : core.phase === "boss" ? "마왕전" : "종료"}`;
  const seconds = Math.floor(core.elapsed);
  $("clock").textContent =
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  $("hp").textContent =
    `${Math.ceil(Math.max(0, player.hp))} / ${player.maxHp}`;
  $("base-hp").textContent =
    `${Math.ceil(Math.max(0, core.baseHp))} / ${core.baseMaxHp}`;
  $("level").textContent = String(core.teamLevel);
  $("kills").textContent = String(player.kills);
  $("rooms").textContent = `${core.discoveredRooms.size} / ${core.rooms.size}`;
  canvas.dataset.phase = core.phase;
  canvas.dataset.playerPosition = `${Math.round(player.x)}:${Math.round(player.y)}`;
  canvas.dataset.tick = String(sequence);
  canvas.dataset.hp = String(player.hp);
  $("objective").textContent =
    core.phase === "night"
      ? "밤에는 베이스를 방어하세요. B로 귀환합니다."
      : core.phase === "boss"
        ? "마왕을 처치하세요."
        : `${core.currentZone}구역 탐험 · 게이트를 찾아 파괴하세요.`;
  const draft = player.upgradeDraft;
  $("upgrade-area").hidden = !draft;
  if (draft && draft.draftId !== draftId) {
    draftId = draft.draftId;
    const choices = $("upgrade-choices");
    choices.replaceChildren();
    for (const choice of draft.choices) {
      const button = document.createElement("button");
      button.type = "button";
      const title = document.createElement("strong");
      title.textContent = choice.name;
      const description = document.createElement("small");
      description.textContent = choice.description;
      button.append(title, description);
      button.addEventListener("click", () => {
        if (core?.chooseUpgrade(LOCAL_USER, draft.draftId, choice.id)) {
          showNotice(`${choice.name} 증강을 선택했습니다.`);
          updateHud();
          canvas.focus({ preventScroll: true });
        }
      });
      choices.append(button);
    }
  }
  if (!draft) draftId = "";
  const slots = { weapon: "무기", armor: "방어구", accessory: "장신구" };
  const rarities = {
    normal: "일반",
    rare: "희귀",
    epic: "영웅",
    legendary: "전설",
    mythic: "신화",
  };
  const equipment = Object.values(player.equipment)
    .filter(Boolean)
    .map((item) => `${rarities[item!.rarity]} ${slots[item!.slot]}`);
  $("equipment").textContent = equipment.length
    ? equipment.join(" / ")
    : "아직 획득한 장비가 없습니다.";
  const nextInventoryKey = JSON.stringify(player.inventory);
  if (nextInventoryKey !== inventoryKey) {
    inventoryKey = nextInventoryKey;
    $("inventory").replaceChildren();
    player.inventory.forEach((item, index) => {
      if (!item) return;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${rarities[item.rarity]} ${slots[item.slot]} 장착`;
      button.addEventListener("click", () => {
        core?.equipInventoryItem(LOCAL_USER, index);
        updateHud();
        canvas.focus({ preventScroll: true });
      });
      $("inventory").append(button);
    });
  }
  const nearWaypoint = [...core.waypoints.values()].find(
    (w) =>
      w.roomId === player.roomId &&
      Math.hypot(w.x - player.x, w.y - player.y) <= 92,
  );
  const destinations = [...core.waypoints.values()].filter(
    (w) => core!.discoveredRooms.has(w.roomId) && w.roomId !== player.roomId,
  );
  $("travel-area").hidden = !nearWaypoint || destinations.length === 0;
  const nextWaypointKey = nearWaypoint
    ? nearWaypoint.id + destinations.map((w) => w.id).join("|")
    : "";
  if (nextWaypointKey !== waypointKey) {
    waypointKey = nextWaypointKey;
    const select = $<HTMLSelectElement>("destination");
    select.replaceChildren();
    for (const waypoint of destinations) {
      const option = document.createElement("option");
      option.value = waypoint.id;
      option.textContent = `${waypoint.zone}구역 ${roomNames[core.rooms.get(waypoint.roomId)!.kind] ?? "웨이포인트"} (${waypoint.id})`;
      select.append(option);
    }
    $<HTMLButtonElement>("travel").onclick = () => {
      const destination = core?.waypoints.get(select.value);
      if (destination && nearWaypoint) {
        showNotice(
          core!.requestTravel(LOCAL_USER, nearWaypoint.id, destination.id)
            ? "3초 동안 웨이포인트 안에서 기다리세요."
            : "지금은 이동할 수 없습니다.",
        );
        canvas.focus({ preventScroll: true });
      }
    };
  }
  if (performance.now() > noticeUntil) $("notice").textContent = "";
  drawMap();
}
function loop(time: number) {
  frame = requestAnimationFrame(loop);
  const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 0;
  previousTime = time;
  if (!core || paused) return;
  accumulated += delta;
  while (accumulated >= STEP) {
    applySoloInput(core, keys, aim, sequence++);
    core.update(STEP);
    effects.push(
      ...core
        .takeCombatActionEvents()
        .map((event) => ({ ...event, remaining: 0.25 })),
    );
    effects = effects.filter((effect) => (effect.remaining -= STEP) > 0);
    for (const notice of core.takeNotices())
      if (!notice.userId || notice.userId === LOCAL_USER)
        showNotice(notice.message);
    accumulated -= STEP;
  }
  draw(time);
  hudElapsed += delta;
  if (hudElapsed > 0.1) {
    hudElapsed = 0;
    updateHud();
  }
  if (core.phase === "ended") {
    paused = true;
    keys.clear();
    $("result-panel").hidden = false;
    $("result-title").textContent =
      core.result === "victory" ? "마왕을 처치했습니다" : "원정이 끝났습니다";
    $("result-text").textContent =
      `${core.resultReason} · ${Math.floor(core.elapsed)}초 · ${core.players.get(LOCAL_USER)!.kills}명 처치`;
    $("restart").focus();
    $<HTMLButtonElement>("pause").disabled = true;
    updateHud();
  }
}
window.addEventListener("error", () => {
  $("game-error").hidden = false;
});
frame = requestAnimationFrame(loop);
