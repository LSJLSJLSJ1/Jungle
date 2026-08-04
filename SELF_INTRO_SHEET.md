# 🎮 개발자 자기소개 및 프로젝트 종합 명세서 (Master Developer Profile & System Docs)

> **문서 개요**: 본 문서는 크래프톤 웹개발 집중캠프(Krafton Web Development Intensive Camp)에서 개발자로서의 성장을 도모하고, 게이머 경험에서 시작하여 **게임 기획자, 게임 클라이언트 프로그래머, 그리고 게임 인공지능(Game AI) 시스템 설계자**로 나아가는 이성재(LSJ_)님의 종합 자기소개서, 3D WebGL 스카이다이빙 미니게임, 팩맨 Ghost Gang AI 시스템, 웹 포트폴리오 아키텍처 및 배포 명세서입니다.

---

## 1. 개발자 소개 & 비전 (Developer Profile & Vision)

- **성함 / 닉네임**: 이성재 / LSJ_
- **소속**: 크래프톤 웹개발 집중캠프 (Krafton Web Development Intensive Camp)
- **목표 직무**: **게임 클라이언트 프로그래머 & 게임 시스템 / AI 기획자**
- **깃허브 주소**: [github.com/LSJLSJLSJ1](https://github.com/LSJLSJLSJ1)
- **이메일**: [leesungjae2002@gmail.com](mailto:leesungjae2002@gmail.com)
- **개발자 비전 & 슬로건**:
  - **"정교하게 설계된 AI 규칙과 메커니즘으로 유저에게 잊지 못할 발견과 몰입의 재미를 선사하는 게임 개발자 이성재입니다."**
  - **"기술과 즐거움 사이에 다리를 놓으며, 인공지능의 가능성을 플레이어의 경험으로 번역하는 개발자가 되겠습니다."**

---

## 2. 웹개발 집중캠프 습득 지식 & 기술 역량 (Skills & Tech Stack)

본 집중캠프 과정을 통해 컴퓨터 과학(CS)의 기초부터 최신 웹 프론트엔드, 3D WebGL 그래픽스, 백엔드 REST API, 그리고 클라우드 배포까지 학습하고 있으며, 이 페이지에서 일부 내용을 직접 구현하고 검증하고 있습니다.

1. **컴퓨터 과학(CS) & 웹 프론트엔드**:
   - HTTP/1.1 프로토콜 요청/응답 수명주기, RESTful API 설계 원칙, 비동기 통신(`Fetch` / `AJAX`).
   - Semantic HTML5, Vanilla Modern CSS (Glassmorphism & Apple Minimalism Layout).
2. **3D 그래픽스 & WebGL 연산 (Three.js)**:
   - Three.js 3D 엔진 기반 렌더링 파이프라인, Vector3 공간 수학 연산, 델타타임(`dt`) 기반 프레임 레이트 독립 물리 루프, Dynamic FOV Kick & Particle System.
3. **백엔드 REST API & 데이터베이스**:
   - Python 3.12+ 및 Flask 3.x 프레임워크 기반 API 서버 구축.
   - SQLite3 RDB 구조 설계 및 방명록 등록·조회 시스템 구현.
4. **클라우드 배포 & DevOps**:
   - Render 무료 클라우드 배포 설정을 준비했으며, AWS EC2 인스턴스·Gunicorn/Nginx 연동은 다음 단계로 진행할 예정입니다.

---

## 3. 게이머에서 모더를 거쳐 개발자로 (Player to Modder to Developer)

게임을 오래 즐기며 밸런스 수치, UI, AI 행동처럼 작은 규칙 하나가 플레이 경험 전체를 바꿀 수 있다는 점에 관심을 갖게 되었습니다. 이 호기심은 게임을 소비하는 데서 멈추지 않고, 이미 만들어진 시스템을 분석하고 직접 바꾸어 보는 모딩 경험으로 이어졌습니다.

- **게이머에서 모더로**:
  - 타르코프(Escape from Tarkov)와 SPT 커뮤니티의 모딩 사례를 접하며, 도탄 수식, 방탄 수치, 총기 부품의 세부 설정이 전투의 판단과 긴장감을 어떻게 바꾸는지 관찰했습니다.
- **모더에서 개발자로**:
  - 이미 존재하는 규칙을 수정하고 결과를 비교하는 경험을 넘어, 이제는 제가 설계한 게임 로직과 클라이언트 상호작용을 코드로 구현하는 개발자의 길을 걷고 있습니다.

---

## 4. 작은 규칙의 조합에서 발견한 게임 로직의 재미 (Small Rules, Complex Play)

게임 로직에 흥미를 갖게 된 핵심 이유는 **사소해 보이는 규칙도 적절하게 조합되면 복잡하고 흥미로운 시스템으로 발전할 수 있기 때문**입니다. 팩맨의 유령 추격 규칙은 이 원리를 가장 직관적으로 보여주는 사례입니다.

### 👻 Classic Pac-Man Ghost Gang (Team Ghost) 추격 알고리즘
1980년 출시된 팩맨의 4마리 유령(Blinky, Pinky, Inky, Clyde)은 복잡한 딥러닝이 아니라 **아주 단순하고 명확한 4가지 결정론적 알고리즘(Deterministic Rules)**만으로 상호 협력하는 듯한 고도의 유기적 추격 AI를 만들어냈습니다.

1. **Blinky (Red Ghost)**: *직진 추격자 (The Chaser)*
   - **AI 규칙**: 항상 팩맨의 현재 위치 좌표를 직속 타겟으로 삼아 바짝 추격.
2. **Pinky (Pink Ghost)**: *길목 매복자 (The Ambusher)*
   - **AI 규칙**: 팩맨이 바라보는 전방 4타일 앞을 타겟으로 설정하여 길목을 차단.
3. **Inky (Cyan Ghost)**: *전술적 포위자 (The Flanker)*
   - **AI 규칙**: Blinky의 위치와 팩맨 전방 2타일 지점의 연장선 벡터를 2배로 확장하여 협공 타겟 생성.
4. **Clyde (Orange Ghost)**: *변덕스러운 방관자 (The Feigned Coward)*
   - **AI 규칙**: 팩맨과의 거리가 8타일 이상일 때는 추격하고, 8타일 이내로 가까워지면 자신의 고유 구석 코너로 후퇴.

각 규칙은 단순하지만 서로 다른 타깃 계산이 동시에 작동하면 플레이어에게는 성격이 다른 유령들이 협공하는 것처럼 느껴집니다. 저는 작은 규칙들의 상호작용이 예측하기 어려운 플레이와 긴장감으로 확장되는 과정에 매력을 느낍니다.

---

## 5. 3D 수송기 강하 컷씬 & 스카이다이빙 미니게임 시스템 (3D Skydive Engine)

웹 브라우저 접속 시 **3D 수송기 적재칸 후방 램프 도어에서 정글 아일랜드 상공으로 강하하는 8초 스카이다이빙 미니게임 컷씬(5초 자유낙하 + 3초 낙하산 하강)**을 거쳐 애플 미니멀리즘 스타일의 포트폴리오로 진입합니다.

- **3D C-130 Hercules 군용 수송기**:
  - 이중격벽 적재함(Double-Walled Fuselage) 구조로 수송기 외부 하늘 투과 방지.
  - T-Tail 수직/수평 꼬리 날개 및 적색 조명 섬광등 탑재.
  - 델타타임(`dt`) 연동 4기 엔진 동적 회전 프로펠러 및 0.25 rad 경사 개방 램프 도어.
- **5초 WASD 강하 미니게임 물리**:
  - 강하 속도 가속(10,000m 고도 → 5초 만에 강하) 하드코어 타임어택 스카이다이빙.
  - Cloud Punch (구름 뚫기 효과), 180개 수직 바람 속도선 및 Dynamic FOV Kick (`55° -> 85°`).
  - 5초 자유낙하 후 반투명 오렌지-레드 낙하산 돔과 4개 산줄 로프 연동 감속 착지.
  - Landing Failure 폭발 연출 (`triggerPoppingExplosion` 3D 입자 파티클 & 충격파 링).
- **무작위 타겟 DZ (Random Flat DZ)**:
  - 5개 산맥 영역 및 강 수역을 제외한 평지 후보에서 매 시행마다 무작위 타겟 DZ 생성.
  - 재시도시 DZ 패드, 보급 상자 2개, 10개 레드 신호 플레어 및 연기 파티클이 동적 이동.
- **HUD 조작 체계**:
  - `착지까지 남은 시간` 단일 지표 및 화면 중앙 하단 통합 조작 HUD (WASD 키캡 + 서클 레이더).

---

## 6. 팩맨 4마리 유령 AI 실시간 추격 실험실 모듈 (Pac-Man Ghost AI Pursuit Lab)

웹사이트 하단에 **"Pac-Man Team Ghost AI Pursuit Playground"** 모듈을 탑재하여 AI 추격 시연에 집중하도록 설계하였습니다.

- **21×21 격자 미로 & 실시간 델타타임 루프**:
  - Canvas 2D 기반 60FPS 렌더링, WASD/방향키 조작 및 팩맨 입모양 애니메이션.
- **원작 타깃 규칙을 참고한 Chase 중심 간소화 구현 & 벽 예외 처리 (`resolveNearestWalkableTile`)**:
  - Pinky, Inky의 예상 벡터가 미로 벽 내부에 위치하더라도, 유령이 벽을 투과하지 않고 벽에서 가장 가까운 이동 가능 타일을 정상 연산하도록 예외 처리.
   - 팩맨이 벽에 충돌하기 전별도 키입력이 없을 경우 오른쪽을 바라보며 굳는 현상을 수정하여 이동 방향 유지.
   - 이 데모는 21×21 간소화 미로에서 네 유령의 Chase 타깃 계산과 시각화에 집중하며, 원작 전체 맵과 전역 Scatter/Frightened 모드는 포함하지 않습니다.
- **AI 디버그 시각화 (AI Radar View)**:
  - `🧠 AI 시각화 켜기` 버튼 클릭 시 실시간 타겟 점선 및 타겟 좌표 박스가 렌더링되어 알고리즘 기반 AI가 만드는 재미를 눈으로 체감.

---

## 7. 웹 포트폴리오 아키텍처 & REST API (System Architecture)

- **프론트엔드**: HTML5, Vanilla CSS, Vanilla JavaScript (ES6+), Three.js (WebGL), jQuery, HTML5 Canvas 2D.
- **백엔드**: Python 3.12+, Flask 3.x, SQLite3.
- **REST API 엔드포인트**:
  - `GET /`: 메인 포트폴리오 / 자기소개 페이지
  - `GET /image/<path:filename>`: 로컬 `C:\Jungle\project1\image` 폴더 내 이미지 서빙 (`AI_RL.webp`, `fable.png`, `mimesis.png`, `atlas.png`, `hamburger.png`)
  - `GET /api/guestbook`: 방명록 데이터 목록 조회
  - `POST /api/guestbook`: 방명록 작성 (`name`, `message`)
  - `GET /api/health`: 서버 헬스 체크

---

## 8. 로컬 실행 & 클라우드 배포 계획 (Deployment Guide)

### 1) 로컬 실행 가이드 (Local Execution)
```powershell
cd C:\Jungle\project1
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```
- 접속 주소: `http://127.0.0.1:5000`

### 2) 무료 클라우드 배포 설정 (Render)
- GitHub 저장소 연결 후 **Web Service** 생성:
  - **Build Command**: `pip install -r requirements.txt`
  - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 app:app`
- 현재 Render 설정은 `/tmp/guestbook.db`를 사용하므로 재시작·재배포 시 방명록이 초기화될 수 있습니다. 실제 운영에는 외부 DB 또는 영속 디스크가 필요합니다.

### 3) AWS EC2 배포 예정 (현재 미배포)

AWS EC2 배포는 아직 완료되지 않았습니다. 다음 단계에서 실제 인스턴스, 보안 그룹, Nginx, Gunicorn 실행을 구성한 뒤 배포 URL과 헬스 체크 결과를 추가합니다.
- Ubuntu EC2 인스턴스 (Port 80/443 Open, 22 SSH)
- Nginx 리버스 프록시 → Gunicorn (`127.0.0.1:8000`)
```bash
sudo apt update && sudo apt install -y git python3-venv python3-pip nginx
git clone <REPOSITORY_URL> ~/project1
cd ~/project1
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
gunicorn --bind 127.0.0.1:8000 --workers 2 app:app &
```
