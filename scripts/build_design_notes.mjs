import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import vm from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const output = resolve(root, "static/portfolio");
const base = (title, summary, body, game, anchor) =>
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#10171c"><title>${escape(title)} | 이성재</title><link rel="stylesheet" href="../css/portfolio.css"><link rel="stylesheet" href="../css/design-notes.css"></head><body><main class="container design-note"><a href="../../index.html#${anchor}">포트폴리오로 돌아가기</a><h1>${escape(title)}</h1><p class="note-lead">${escape(summary)}</p>${body}<div class="note-end"><a class="button primary" href="../games/${game}">싱글플레이</a><a href="../../index.html#${anchor}">프로젝트로 돌아가기</a></div></main></body></html>`;
const bundled = await build({
  entryPoints: [resolve(root, "demos/vendor/game-core/index.ts")],
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  alias: {
    "@five-days/protocol": resolve(root, "demos/vendor/protocol/index.ts"),
  },
});
const { CLASS_COMBAT_RULES, OFFICIAL_MAP_MANIFEST } = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundled.outputFiles[0].text).toString("base64")
);
const { world, map } = OFFICIAL_MAP_MANIFEST;
const classes = { swordsman: "검사", archer: "궁수", mage: "마법사" };
const rows = Object.entries(CLASS_COMBAT_RULES)
  .map(
    ([id, r]) =>
      `<tr><th scope="row">${classes[id]}</th><td>${r.hp}</td><td>${r.attackDamage}</td><td>${r.attackRange}</td><td>${r.attackInterval.toFixed(2)}초</td></tr>`,
  )
  .join("");
const names = new Map(
  map.rooms.map((room) => [`editor:${room.id}`, room.name]),
);
const mapRects = world.rooms
  .map((room) => {
    const color =
      room.kind === "start"
        ? "#f1f4f5"
        : room.kind === "boss"
          ? "#e7c881"
          : room.kind === "gate"
            ? "#dc958d"
            : ["#8ebaa3", "#8bb9c5", "#bba8c9"][room.zone - 1];
    return `<rect x="${room.rect.x}" y="${room.rect.y}" width="${room.rect.width}" height="${room.rect.height}" fill="${color}" stroke="#10171c" stroke-width="30"><title>${escape(names.get(room.id) ?? room.id)}</title></rect>`;
  })
  .join("");
const corridors = world.connections
  .map((connection) =>
    connection.floorRects
      .map(
        (rect) =>
          `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="#60747c"/>`,
      )
      .join(""),
  )
  .join("");
const rpg = `<section><h2>개인 기여</h2><p>게임 시스템, 레벨 디자인, 캐릭터 밸런싱.</p></section><section><h2>탐험과 방어 사이의 선택</h2><p>낮에는 방을 탐험하며 장비와 증강을 얻고 게이트를 파괴해 다음 구역을 엽니다. 밤에는 베이스로 밀려오는 적을 방어합니다. 밖에서 성장할 시간과 돌아와 방어할 시간을 같은 원정 안에서 배분합니다.</p><ol class="game-flow"><li>방 탐험과 전투</li><li>장비·증강 성장</li><li>게이트 파괴</li><li>베이스 방어·다음 구역 진입</li></ol></section><section><h2>레벨 구조</h2><p>공식 맵은 3개 구역, ${world.rooms.length}개 방으로 구성됩니다. 현재 구역의 게이트를 모두 파괴해야 다음 구역에 진입할 수 있습니다. 발견한 웨이포인트는 3초 대기 후 이동할 수 있어 탐험 경로와 귀환 경로를 연결합니다.</p><figure class="note-map"><svg viewBox="0 0 ${world.bounds.width} ${world.bounds.height}" role="img" aria-label="공식 맵의 세 구역, 방과 연결 통로"><title>5일 뒤 마왕 공식 맵</title>${corridors}${mapRects}</svg><figcaption>흰색: 베이스 / 붉은색: 게이트 / 금색: 보스 방</figcaption></figure></section><section><h2>직업별 기본 전투 수치</h2><p>장비와 증강을 적용하기 전의 기본값입니다.</p><div class="table-scroll" tabindex="0" role="region" aria-label="직업별 수치 표"><table><thead><tr><th scope="col">직업</th><th scope="col">체력</th><th scope="col">기본 피해</th><th scope="col">공격 거리</th><th scope="col">공격 주기</th></tr></thead><tbody>${rows}</tbody></table></div><p>검사는 높은 체력과 짧은 사거리, 궁수는 긴 사거리와 빠른 기본 공격, 마법사는 범위 스킬을 갖습니다. 파티의 공유 성장에 개인별 장비·증강 선택을 더합니다.</p></section><section><h2>소스 코드</h2><ul><li>게임 규칙: <code>packages/game-core/src/v02/simulation.ts</code></li><li>레벨: <code>official-map.generated.json</code></li><li>원본 코드: <a href="https://github.com/LH99Tw/Krafton-jungle-project3" target="_blank" rel="noopener noreferrer">Krafton-jungle-project3</a></li></ul></section>`;
await writeFile(
  resolve(output, "design-demon-king.html"),
  base(
    "5일 뒤 마왕 · 설계 노트",
    "탐험과 베이스 방어를 함께 다루는 협동 액션 RPG.",
    rpg,
    "demon-king/index.html",
    "demon-king",
  ),
);

const sandbox = { window: {} };
vm.runInNewContext(
  await readFile(resolve(root, "static/games/shooter/operators.js"), "utf8"),
  sandbox,
);
const operators = sandbox.window.BREACHLINE_OPERATORS;
const selected = ["soldier", "bulwark", "sentinel", "sniper"].map((id) =>
  operators.find((op) => op.id === id),
);
const operatorRows = selected
  .map(
    (op) =>
      `<tr><th scope="row">${escape(op.koreanName)}</th><td>${escape(op.role)}</td><td>${escape(op.traits[0])}</td><td>${escape(op.traits[op.id === "bulwark" ? 1 : 2])}</td></tr>`,
  )
  .join("");
const shooter = `<section><h2>개인 기여</h2><p>게임 시스템, 캐릭터 밸런싱, 캐릭터 스킬.</p></section><section><h2>시야가 전투의 정보가 되도록</h2><p>같은 전장에서도 엄폐물과 바라보는 방향에 따라 볼 수 있는 영역이 달라집니다. 연막은 안과 밖의 시야를 분리하고, 섬광은 일시적으로 정보를 차단합니다. 이동 경로와 교전 타이밍을 무기 선택과 함께 판단하는 구조입니다.</p></section><section><h2>병과별 능력과 제약</h2><p>10종 병과 중 네 병과의 능력을 비교했습니다.</p><div class="table-scroll" tabindex="0" role="region" aria-label="병과별 역할과 제약 비교 표"><table><thead><tr><th scope="col">병과</th><th scope="col">역할</th><th scope="col">기본 공격</th><th scope="col">능력·제약</th></tr></thead><tbody>${operatorRows}</tbody></table></div><p>방패 전개 중 이동 감소, 레일건의 충전 시간, 저격수의 이동 속도 감소처럼 능력의 이점과 사용 조건을 함께 둡니다.</p></section><section><h2>플레이에서 확인할 요소</h2><ul><li>엄폐물 모서리에서 시야와 사격 각도가 어떻게 바뀌는지</li><li>병과의 이동·사거리·스킬 차이가 진입 방식에 주는 영향</li><li>투사체, 근접, 히트스캔과 폭발 범위의 피격 규칙</li></ul><p>선택한 병과로 AI 5명과 대전합니다.</p></section><section><h2>근거 자료</h2><ul><li>병과 정의: <code>operators.js</code></li><li>전투와 스킬 구현: <code>operator-system.js</code></li><li>원본 코드: <a href="https://github.com/Frogyyh/jungle4sprint1" target="_blank" rel="noopener noreferrer">jungle4sprint1</a></li></ul></section>`;
await writeFile(
  resolve(output, "design-shooter.html"),
  base(
    "Visual Shooting Code · 설계 노트",
    "시야, 엄폐물, 병과 능력을 조합하는 탑다운 전술 슈터.",
    shooter,
    "shooter/game.html",
    "visual-shooting-code",
  ),
);
console.log("Built two design notes from the game rules and official map.");
