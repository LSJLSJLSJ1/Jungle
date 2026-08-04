"""Build the Flask-rendered portfolio as a relative-path GitHub Pages site.

GitHub Pages can host the visual portfolio and browser games, but it cannot run
the Flask process or the SQLite-backed guestbook API. This build keeps the
front-end self-contained and enables a graceful static-mode message for the
guestbook.
"""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def replace_flask_urls(html: str) -> str:
    """Convert the template's Flask URL helpers to project-relative URLs."""

    static_pattern = re.compile(
        r"\{\{\s*url_for\(\s*['\"]static['\"]\s*,\s*"
        r"filename\s*=\s*['\"]([^'\"]+)['\"][^)]*\)\s*\}\}"
    )
    image_pattern = re.compile(
        r"\{\{\s*url_for\(\s*['\"]serve_image['\"]\s*,\s*"
        r"filename\s*=\s*['\"]([^'\"]+)['\"][^)]*\)\s*\}\}"
    )
    home_pattern = re.compile(
        r"\{\{\s*url_for\(\s*['\"]home['\"][^)]*\)\s*\}\}"
    )

    html = static_pattern.sub(lambda match: f"./static/{match.group(1)}", html)
    html = image_pattern.sub(lambda match: f"./image/{match.group(1)}", html)
    html = home_pattern.sub("./", html)
    html = re.sub(r"((?:src|href)=['\"])/image/", r"\1./image/", html)
    return html


def build(output_dir: Path) -> None:
    template_path = ROOT / "templates" / "index.html"
    static_dir = ROOT / "static"
    image_dir = ROOT / "image"

    if not template_path.is_file():
        raise FileNotFoundError(f"Missing template: {template_path}")
    if not static_dir.is_dir():
        raise FileNotFoundError(f"Missing static directory: {static_dir}")
    if not image_dir.is_dir():
        raise FileNotFoundError(f"Missing image directory: {image_dir}")

    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)

    html = replace_flask_urls(template_path.read_text(encoding="utf-8"))
    main_script = '<script src="./static/js/main.js"></script>'
    static_config = (
        '    <script>window.SITE_CONFIG = { staticMode: true };</script>\n'
    )
    if main_script not in html:
        raise RuntimeError("Could not find the main.js script tag to inject static mode")
    html = html.replace(main_script, static_config + "    " + main_script, 1)

    if "{{" in html or "url_for(" in html:
        raise RuntimeError("Unresolved Flask template syntax remains in docs/index.html")

    (output_dir / "index.html").write_text(html, encoding="utf-8")
    shutil.copytree(static_dir, output_dir / "static")
    shutil.copytree(image_dir, output_dir / "image")
    (output_dir / ".nojekyll").write_text("", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "docs",
        help="Generated GitHub Pages directory (default: ./docs)",
    )
    args = parser.parse_args()
    build(args.output.resolve())
    print(f"GitHub Pages build written to {args.output.resolve()}")


if __name__ == "__main__":
    main()
