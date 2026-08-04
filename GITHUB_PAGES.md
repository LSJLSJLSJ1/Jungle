# GitHub Pages 배포 안내

이 프로젝트는 GitHub Actions로 Flask 템플릿을 정적 페이지로 변환해 GitHub Pages에 배포할 수 있습니다.

## 로컬 정적 빌드

```powershell
cd C:\Jungle\project1
.venv\Scripts\python.exe scripts\build_github_pages.py
```

빌드 결과는 `docs/`에 생성됩니다. 페이지와 브라우저 미니게임은 정적으로 동작하지만, Flask와 SQLite가 필요한 방명록 저장 기능은 GitHub Pages에서 사용할 수 없으므로 안내 메시지를 표시합니다.

## GitHub 저장소에 연결

현재 작업 폴더에는 Git 저장소와 remote가 연결되어 있지 않습니다. GitHub에서 사이트용 public 저장소를 만든 뒤 아래처럼 연결합니다.

```powershell
git init
git branch -M main
git remote add origin https://github.com/<OWNER>/<REPOSITORY>.git
git add .
git commit -m "Prepare GitHub Pages deployment"
git push -u origin main
```

`.github/workflows/deploy-pages.yml`이 `main` push를 감지해 빌드하고 자동 배포합니다. GitHub 저장소의 **Settings → Pages → Source**는 **GitHub Actions**로 설정해야 합니다.

배포 주소는 보통 `https://<OWNER>.github.io/<REPOSITORY>/`입니다.
