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
const rpg = `<dl class="case-meta"><div><dt>제작</dt><dd>5일 이내 / 3인 팀</dd></div><div><dt>개인 기여</dt><dd>게임 시스템, 레벨 디자인, 캐릭터 밸런싱</dd></div><div><dt>참고한 게임</dt><dd>Vampire Survivors, 리그 오브 레전드 집중포화</dd></div></dl>
<section><h2>성장하며 다음 단계로</h2><p>필드에서 생존을 반복하는 구조에서 출발해, 성장하며 구역을 돌파하고 최종 목표에 도달하는 경험을 만들고자 했습니다. 낮에는 성장과 탐험에 집중하고 밤에는 베이스로 밀려오는 웨이브를 막습니다.</p><ol class="game-flow"><li>탐험과 성장</li><li>게이트 돌파</li><li>야간 베이스 방어</li><li>다음 구역과 마왕 도전</li></ol></section>
<section><h2>탐험과 방어의 인원 배분</h2><p>웨이브 몬스터가 주는 경험치를 낮게 설정해 방어만으로 성장하기 어렵게 했습니다. 밤에는 일부 인원이 탐험을 이어가고 나머지는 웨이브를 막는 역할 분담을 의도했습니다.</p><p>싱글플레이의 AI 동료는 베이스를 지키는 수비 역할과 플레이어를 따라 탐험하는 추종 역할로 나눴습니다.</p></section>
<section><h2>테스트에서 확인한 문제와 조정</h2><dl class="design-case"><div><dt>관찰</dt><dd>낮에 충분히 성장한 경우, 후반 일차에도 한 명이 웨이브를 모두 막을 수 있었습니다.</dd></div><div><dt>조정</dt><dd>증강 효과를 하향하고 레벨업 경험치를 조정했습니다.</dd></div><div><dt>목표</dt><dd>후반에는 두 명이 방어를 맡아야 하도록 성장과 방어 난도를 맞췄습니다.</dd></div></dl></section>
<section><h2>레벨 구조</h2><p>3개 구역, ${world.rooms.length}개 방을 연결했습니다. 게이트로 구역 진행을 나누고 웨이포인트로 탐험과 귀환 경로를 연결합니다.</p><figure class="note-map"><svg viewBox="0 0 ${world.bounds.width} ${world.bounds.height}" role="img" aria-label="공식 맵의 세 구역, 방과 연결 통로"><title>5일 뒤 마왕 공식 맵</title>${corridors}${mapRects}</svg><figcaption>흰색: 베이스 / 붉은색: 게이트 / 금색: 보스 방</figcaption></figure></section>
<section><h2>현재 직업별 기본 수치</h2><p>장비와 증강을 적용하기 전의 기본값입니다.</p><div class="table-scroll" tabindex="0" role="region" aria-label="직업별 수치 표"><table><thead><tr><th scope="col">직업</th><th scope="col">체력</th><th scope="col">기본 피해</th><th scope="col">공격 거리</th><th scope="col">공격 주기</th></tr></thead><tbody>${rows}</tbody></table></div></section>
<section><h2>소스 코드</h2><p><a href="https://github.com/LSJLSJLSJ1/Jungle/tree/main/demos/vendor/game-core" target="_blank" rel="noopener noreferrer">게임 규칙과 공식 맵</a></p></section>`;
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
const shooter = `<dl class="case-meta"><div><dt>제작</dt><dd>5일 이내 / 4인 팀</dd></div><div><dt>개인 기여</dt><dd>게임 시스템, 캐릭터 밸런싱, 캐릭터 스킬 기획</dd></div><div><dt>팀 기획</dt><dd>클래스 다양화</dd></div><div><dt>참고한 게임</dt><dd>PUBG BLINDSPOT, Rainbow Six, Overwatch</dd></div></dl>
<section><h2>전술 슈터에서 클래스 조합으로</h2><p>PUBG BLINDSPOT에서 영감을 받아 시작했습니다. 초기에는 섬광탄을 활용하는 Rainbow Six 스타일의 전술을 기획했습니다. 이후 클래스를 다양화하면서 상대 팀과 아군의 조합에 초점을 맞췄습니다.</p></section>
<section><h2>연막으로 원거리 시야에 대응</h2><p>Counter-Strike와 VALORANT를 참고해 연막 안팎의 시야 규칙을 설계했습니다. 원거리 캐릭터에게 유리한 시야를 차단하는 것이 목적이었습니다.</p><dl class="design-case"><div><dt>설계 목표</dt><dd>긴 사거리와 시야의 이점을 연막으로 줄이기</dd></div><div><dt>게임 규칙</dt><dd>연막 안과 밖의 시야를 분리하고 섬광으로 일시적으로 정보를 차단</dd></div><div><dt>플레이 확인</dt><dd>엄폐물 모서리, 조준 방향, 연막 안팎에서 보이는 영역 비교</dd></div></dl></section>
<section><h2>프로젝트의 병과 설정</h2><p>10종 병과 중 네 병과의 현재 설정입니다.</p><div class="table-scroll" tabindex="0" role="region" aria-label="병과별 역할과 제약 비교 표"><table><thead><tr><th scope="col">병과</th><th scope="col">역할</th><th scope="col">기본 공격</th><th scope="col">능력과 제약</th></tr></thead><tbody>${operatorRows}</tbody></table></div></section>
<section><h2>소스 코드</h2><p><a href="https://github.com/LSJLSJLSJ1/Jungle/tree/main/static/games/shooter" target="_blank" rel="noopener noreferrer">시야, 병과와 전투 규칙</a></p></section>`;
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
