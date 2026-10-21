"""Vendor the two local game projects for a self-contained portfolio build.

Explicitly invoked when updating games. Normal builds do not need sibling repos.
"""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT.parent


def copy(source, target):
    if source.is_dir():
        shutil.copytree(source, target, dirs_exist_ok=True)
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def revision(path):
    return subprocess.check_output(["git", "-C", str(path), "rev-parse", "HEAD"], text=True).strip()


def main():
    shooter = SOURCES / "GameProject1"
    rpg = SOURCES / "GameProject2"
    shooter_files = ["index.html", "landing.js", "game.html", "game.js", "operators.js", "operator-system.js", "quality-pass.js", "frog.js", "asset-visuals.js", "lobby-bridge.js", "multiplayer-client.js", "styles.css", "Asset", "ui"]
    for name in shooter_files:
        copy(shooter / name, ROOT / "static/games/shooter" / name)
    game_path = ROOT / "static/games/shooter/game.html"
    game_html = game_path.read_text(encoding="utf-8").replace('</head>', '<link rel="stylesheet" href="../../css/shooter-portfolio.css"></head>')
    game_html = game_html.replace('</body>', '<a class="portfolio-return" href="../../../index.html#visual-shooting-code">포트폴리오로 돌아가기</a><script defer src="../../js/shooter-portfolio.js"></script></body>')
    game_path.write_text(game_html, encoding="utf-8")
    for package in ["game-core", "protocol"]:
        copy(rpg / "packages" / package / "src", ROOT / "demos/vendor" / package)
    assets = rpg / "apps/web/public/Asset"
    for filename in ["WarriorSprite.png", "ArcherSprite.png", "MageSprite-v2.png", "goblin-unarmed-8dir-walk-v1.png", "skeleton-unarmed-8dir-walk-v1.png", "demon-unarmed-8dir-walk-v1.png"]:
        copy(assets / "sprites" / filename, ROOT / "static/games/demon-king/assets" / filename)
    copy(assets / "environment/expedition-base-house-v1.png", ROOT / "static/games/demon-king/assets/base.png")
    for zone in [1, 2, 3]:
        copy(assets / f"waypoints/waypoint-circle-zone-{zone}.png", ROOT / f"static/games/demon-king/assets/waypoint-{zone}.png")
        copy(assets / f"zone-{zone}-room-corridor-atlas.png", ROOT / f"static/games/demon-king/assets/terrain-{zone}.png")
    for name in ["echo-shrine", "trap-device", "checkpoint-runestone", "blood-altar"]:
        copy(assets / f"special-rooms/{name}.webp", ROOT / f"static/games/demon-king/assets/{name}.webp")
    copy(rpg / "apps/web/public/images/boss_dragon.png", ROOT / "static/games/demon-king/assets/boss.png")
    files = {}
    for folder in [ROOT / "demos/vendor", ROOT / "static/games/shooter", ROOT / "static/games/demon-king/assets"]:
        for file in sorted(folder.rglob("*")):
            if file.is_file():
                files[file.relative_to(ROOT).as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
    manifest = {
        "sourceProjects": {
            "GameProject1": {"commit": revision(shooter), "repository": "https://github.com/Frogyyh/jungle4sprint1"},
            "GameProject2": {"commit": revision(rpg), "repository": "https://github.com/LH99Tw/Krafton-jungle-project3"},
        },
        "note": "Copies reflect local working files at sync time; hashes identify exact contents. RPG demo uses original GameCore with a portfolio-specific Canvas renderer; no production backend is bundled.",
        "sha256": files,
    }
    (ROOT / "demos/sources.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Synced {len(files)} game files; no server credentials copied.")


if __name__ == "__main__":
    main()
