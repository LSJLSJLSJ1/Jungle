# 🎮 Krafton Jungle Web Dev Camp — Project 1 Portfolio & Developer Self-Intro

> **마스터 통합 문서**: 프로젝트의 전체 구현 명세, 3D 스카이다이빙 미니게임, 팩맨 Ghost Gang AI 연산 구조, 개발자 이성재의 비전 및 배포 가이드는 통합 문서인 **[`SELF_INTRO_SHEET.md`](SELF_INTRO_SHEET.md)**에 모두 합쳐져 일원화 관리되고 있습니다.

---

## 🚀 빠른 로컬 실행 가이드 (Quick Start)

```powershell
# 1. 프로젝트 디렉터리 이동
cd c:\Jungle\project1

# 2. Python 가상환경 생성 및 활성화
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3. 필수 의존성 설치
pip install -r requirements.txt

# 4. Flask 서버 실행
python app.py
```
- 브라우저 접속: **`http://127.0.0.1:5000`**
- 헬스 체크: `http://127.0.0.1:5000/api/health`

---

## 🤝 AI와 함께 만든 과정 및 발표 준비

이 프로젝트에서 AI는 코드를 대신 완성하는 도구가 아니라, 요구사항을 구조화하고 구현 방법을 비교하며 오류를 빠르게 찾는 개발 파트너로 활용했습니다. 최종 코드는 직접 실행하고 수정하면서 동작 원리를 확인해야 합니다.

### AI를 활용한 작업 흐름

1. **요구사항 구조화**: 자기소개 페이지의 섹션, 3D 강하 인트로, 팩맨 AI 시연, 방명록 API의 범위를 정리했습니다.
2. **구현 초안과 대안 비교**: HTML/CSS 레이아웃, Three.js 씬 구성, Canvas 게임 루프, Flask API의 구현 초안을 검토했습니다.
3. **문제 재현과 수정**: 팩맨이 벽에 닿은 뒤 조작되지 않는 문제, 방향 유지 문제, 이미지 경로 문제를 직접 재현하고 수정했습니다.
4. **검증**: JavaScript 문법 검사, Python 컴파일 검사, localhost 응답, 이미지 라우트, 헬스 체크 API를 확인했습니다.
5. **콘텐츠 개선**: 기술을 나열하는 대신 “규칙을 설계해 플레이어의 경험으로 번역한다”는 하나의 메시지로 자기소개를 다시 구성했습니다.

### 발표에서 설명할 수 있어야 하는 구현 원리

#### 1. Flask 요청 흐름

- `/` 요청이 `render_template('index.html')`을 통해 자기소개 페이지를 반환합니다.
- `/image/<filename>`은 `project1/image`의 로컬 이미지를 제공합니다.
- `/api/guestbook`은 GET으로 목록을 읽고 POST로 메시지를 SQLite에 저장합니다.
- 프론트엔드는 Fetch/AJAX로 API를 호출하고, 응답을 DOM에 다시 렌더링합니다.

#### 2. Three.js 강하 미니게임

- `init3DCutscene()`에서 Scene, Camera, Renderer, 조명과 3D 오브젝트를 생성합니다.
- `requestAnimationFrame` 루프에서 `dt`와 경과 시간을 사용해 프레임 속도와 무관하게 움직임을 계산합니다.
- 상태는 `IDLE → JUMPING → MINIGAME → LANDED/FAILED`로 전환됩니다.
- 강하 단계에서는 플레이어 위치, 고도, 구름, 속도선, FOV, 낙하산, 착지 판정을 함께 갱신합니다.

#### 3. 팩맨 유령 AI

- 21×21 간소화 미로에서 타일 단위 이동과 충돌을 처리합니다.
- Blinky는 팩맨의 현재 타일, Pinky는 전방 4칸, Inky는 Blinky와 전방 타일 사이의 확장 벡터를 타깃으로 삼습니다.
- Clyde는 거리에 따라 팩맨을 추격하거나 지정된 후퇴 타일을 향합니다.
- 현재 데모는 원작의 타깃 계산 규칙을 참고한 **CHASE 중심의 간소화 시연**이며, 원작 전체 맵과 Scatter/Frightened 모드를 복제한 구현은 아닙니다.

#### 4. 방명록과 데이터 저장

- SQLite 테이블은 `id`, `name`, `message`, `created_at`으로 구성됩니다.
- 입력값은 서버에서 다시 확인해야 하며, 화면의 필수 입력만으로 보안이 완성되는 것은 아닙니다.
- 방명록은 의도적으로 등록·조회 전용으로 단순화했으며, 이름과 메시지 길이는 서버에서도 검증합니다.
- Render 무료 인스턴스의 `/tmp` SQLite는 영속 저장소가 아니므로, 실제 운영 전에는 외부 DB 또는 영속 디스크 정책이 필요합니다.

### 발표 대비 질문

| 질문 | 설명할 핵심 |
|---|---|
| 왜 팩맨 AI를 선택했는가? | 복잡한 모델 없이도 서로 다른 타깃 규칙의 상호작용이 협공과 긴장감으로 느껴지기 때문입니다. |
| 왜 원작을 간소화했는가? | 전체 게임 복제보다 네 유령의 타깃 벡터와 규칙 차이를 시각적으로 보여주는 데 집중하기 위해서입니다. |
| AI가 만든 코드를 어떻게 검증했는가? | 문제를 직접 재현하고, 코드를 읽고, 문법 검사·API 확인·브라우저 동작 확인을 거쳤습니다. |
| 가장 직접적으로 이해해야 할 부분은 무엇인가? | 상태 머신, `dt` 기반 루프, 타깃 벡터 계산, Flask 요청-응답, SQLite 저장 흐름입니다. |
| 다음 단계는 무엇인가? | AWS EC2 배포, 배포 환경에서의 데이터 저장 정책, 발표용 구현 설명 자료를 완성하는 것입니다. |

> 발표 전에는 위 내용을 코드의 해당 함수와 함께 본인의 말로 설명할 수 있는지 다시 점검합니다. AI의 설명을 그대로 외우는 것이 아니라, 직접 실행한 결과와 수정한 이유를 기준으로 답합니다.

---

## 🚧 배포 현황

- **현재**: `http://127.0.0.1:5000` 로컬 실행 확인
- **Render**: `render.yaml`과 `Procfile` 배포 설정 준비
- **AWS EC2**: 아직 배포하지 않았으며, 다음 단계에서 진행 예정
- **도메인**: 현재 사용하지 않음. 요구사항상 선택 사항

AWS 배포가 완료되기 전까지는 자기소개나 문서에서 “AWS 배포 완료”라고 표현하지 않습니다. 실제 배포 후 URL, `/api/health` 응답, Nginx/Gunicorn 실행 방식, SQLite 데이터 보존 정책을 이 문서에 추가합니다.

---

## 📚 통합 문서 안내 (Master Documentation Link)

모든 개별 명세서(`SKYDIVE_3D_CUTSCENE_DOCS.md`, `DEPLOYMENT.md`, 자기소개서)가 **[`SELF_INTRO_SHEET.md`](SELF_INTRO_SHEET.md)**로 통합 및 병합되었습니다.

1. **[개발자 소개 & 비전](SELF_INTRO_SHEET.md#1-개발자-소개--비전-developer-profile--vision)**: 크래프톤 웹개발 집중캠프 이성재(LSJ_)님의 비전
2. **[기술 역량 & CS 지식](SELF_INTRO_SHEET.md#2-웹개발-집중캠프-습득-지식--기술-역량-skills--tech-stack)**: 3D WebGL, Flask REST API, SQLite3
3. **[게이머에서 모더를 거쳐 개발자로](SELF_INTRO_SHEET.md#3-게이머에서-모더를-거쳐-개발자로-player-to-modder-to-developer)**: 플레이·모딩·개발로 이어진 관심의 확장
4. **[작은 규칙의 조합과 팩맨 추격 로직](SELF_INTRO_SHEET.md#4-작은-규칙의-조합에서-발견한-게임-로직의-재미-small-rules-complex-play)**: Blinky, Pinky, Inky, Clyde 실시간 연산 및 벽 예외 처리
5. **[3D 수송기 강하 미니게임](SELF_INTRO_SHEET.md#5-3d-수송기-강하-컷씬--스카이다이빙-미니게임-시스템-3d-skydive-engine)**: C-130, 8초 강하, Cloud Punch, Dynamic FOV Kick, 3D 착지 실패 폭발
6. **[배포 계획](SELF_INTRO_SHEET.md#8-로컬-실행--클라우드-배포-계획-deployment-guide)**: Render 설정 및 AWS EC2 배포 예정 절차
