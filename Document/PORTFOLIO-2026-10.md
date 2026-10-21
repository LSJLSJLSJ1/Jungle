# 제출용 포트폴리오 운영 가이드

2026-10-22 기준. 지원 직무는 **Game Development – Game Design**이다.

## 현재 구성

- 순서: 기존 강하 미니게임 → 자기소개 → 관심 있는 것 → 만든 것 → 자료·연락처
- 자기소개: 이름, 모딩에서 시작한 제작 경험, 지원 직무, 교육과 사용 도구
- 관심 분야: 게임 규칙과 밸런스, 게임 AI, AI를 활용한 제작
- 관심 자료: 버그 소탕·팩맨 시연, 정지 가능한 강화학습 영상, 출처를 표시한 Fable·MIMESIS·Atlas 이미지. 정적 빌드에도 `image/`를 포함한다.
- 두 게임의 제작 기간(각 5일 이내)과 팀 규모(4인·3인), 인터뷰에서 확인한 기획 사례를 설계 노트에 반영했다. 근거는 `Document/INTERVIEW-2026-10.md`다.
- 사용 도구 나열, 관심 분야 보기 바로가기, 링크 복사 기능을 삭제했다. 출입 게이트 논문과 개인 담당 처리 흐름을 자료 목록에 추가했다.
- 게임별 개인 기여: 사용자가 확인한 시스템·밸런싱·스킬·레벨 디자인
- 설계 노트: 실제 병과 설정, 직업 수치와 공식 레벨 배치로 생성
- GameProject1: 원본 클라이언트 기반 오프라인 AI 5인 대전
- GameProject2: 원본 GameCore와 공식 48개 방을 사용하는 인간 1명 + AI 2명 체험판. 별도 Canvas 화면으로 실행되며 로그인·기록 저장·온라인 UI는 포함하지 않는다.
- 강하 미니게임은 진입 화면에 복원했고 자기소개 바로 가기를 항상 표시한다. 모션 줄이기·WebGL 불가·JS 미실행 시 본문을 바로 읽는다. 프로젝트 앵커로 복귀할 때는 인트로를 재생하지 않는다.
- 팩맨 AI는 관심 분야에서 연결한다. 기존 방명록 API와 DB는 유지하되 제출용 본문에 입력 폼은 노출하지 않는다.

## 로컬 확인

```powershell
cd C:\Users\LSJ\Desktop\Project\KraftonJungle\IntroductionProject
pnpm install --frozen-lockfile --ignore-scripts
pnpm typecheck:demos
pnpm test:demos
pnpm build:demos
python scripts/build_github_pages.py
python scripts/verify_static.py
python -m http.server 5080 --bind 127.0.0.1 --directory docs
```

`http://127.0.0.1:5080/`는 이 PC의 미리보기 주소다. 외부 제출 주소로 사용하지 않는다. Flask로도 실행할 수 있으며 `/`, `/index.html`, `/demos/pacman.html`, `/demos/skydiving.html`을 지원한다.

## GitHub Pages

대상 저장소는 `LSJLSJLSJ1/Jungle`이며 확인 당시 Pages가 활성화되어 있었다. 기존 제출 경로는 `https://lsjlsjlsj1.github.io/Jungle/`다. 로컬 변경과 생성 파일만으로 원격 사이트가 갱신되지는 않는다.

`.github/workflows/deploy-pages.yml`은 `main` push 또는 수동 실행 시 타입 검사 → 테스트 → 데모·설계 노트 빌드 → 정적 빌드 → 경로 검사 → Pages 배포를 수행한다. 배포 후 외부 URL에서 첫 화면, 두 게임 시작·복귀, 설계 노트, OG 이미지와 PDF를 다시 확인한다.

주소가 바뀌면 `python scripts/build_github_pages.py --site-url https://example.com/path/`를 사용한다. canonical·OG·sitemap은 절대 주소로, 페이지 리소스는 상대 주소로 생성된다.

## 원본 게임 갱신

```powershell
python scripts/sync_games.py
pnpm typecheck:demos
pnpm test:demos
pnpm build:demos
```

이 명령만 형제 폴더의 GameProject1/2를 읽는다. 평소 빌드와 CI는 `demos/vendor/`와 `static/games/`에 포함한 사본을 사용하므로 별도 서버나 형제 저장소가 필요 없다. 복사한 원본 커밋·파일 SHA256은 `demos/sources.json`에 기록한다. 작업 트리의 수정도 복사될 수 있어 SHA256이 정확한 사본 식별자다.

`static/games/demon-king/game.js`와 두 설계 노트 HTML은 생성물이다. 직접 수정하지 않고 `demos/*.ts`와 `scripts/build_design_notes.mjs`를 편집한다. 슈터 화면의 복귀 링크는 sync 단계에서 추가하며 원본 형제 저장소는 변경하지 않는다.

## 미디어와 스킬

- 화면용 스크린샷은 WebP, 공유 이미지는 1200×630 PNG다. 원본 PNG·PDF는 보존했다.
- `scripts/prepare_media.py`는 Pillow가 필요한 선택적 미디어 재생성 도구다. 생성물을 함께 보관하므로 CI는 Pillow 없이 빌드한다.
- 폰트는 Pretendard Variable을 로컬 제공하며 OFL 라이선스를 함께 보관한다. 강하 체험의 Three.js·jQuery도 로컬 파일이다.
- 스킬의 검증 기준은 작업공간 `Skill/VERIFIED-2026-10.md`, 고정 SHA는 `Skill/sources.lock.json`을 따른다. 디자인 스킬 4개와 NomaDamas/k-skill의 한국어 윤문·맞춤법·글자 수 스킬 3개를 `Skill/upstream`과 Codex 공용 skills에 설치했다.
- 본문은 실행 방식·로그인·기록 저장 안내와 반복 설명을 삭제했다. 사용자 지정 직무·개인 기여·고유명사는 유지했다. 맞춤법 검사기의 모딩→코딩, 스카이림→스카이 림 등 오탐은 반영하지 않았다.

## 변경 범위

기존에 남아 있던 파일 삭제·문서 이동·논문 PDF·`static/css/style.css`의 수정은 되돌리지 않았다. 기존 홈 템플릿은 `.local-backup/index-before-2026-10-22.html`에 보관했다. 로컬 DB, `.env`, 백업과 검수 스크린샷은 Pages 산출물에 포함하지 않는다.
