"""Build a self-contained portfolio for a GitHub Pages project subpath."""
from __future__ import annotations

import argparse
import hashlib
import re
import shutil
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qsl, urlencode, urlunparse, unquote

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SITE_URL = "https://lsjlsjlsj1.github.io/Jungle/"


def replace_flask_urls(html: str, site_url: str = DEFAULT_SITE_URL) -> str:
    def replace(match):
        endpoint, arguments = match.group(1), match.group(2)
        filename = re.search(r"filename\s*=\s*['\"]([^'\"]+)['\"]", arguments)
        if endpoint == "home":
            path = "./"
        elif endpoint in {"static", "demos", "serve_image"} and filename:
            prefix = {"static": "static", "demos": "demos", "serve_image": "image"}[endpoint]
            path = f"./{prefix}/{filename.group(1)}"
        else:
            raise ValueError(f"Unsupported template endpoint: {endpoint}")
        return urljoin(site_url, path) if "_external=True" in arguments or "_external = True" in arguments else path

    return re.sub(r"\{\{\s*url_for\(['\"]([^'\"]+)['\"]([^)]*)\)\s*\}\}", replace, html)


def build(output: Path, site_url: str = DEFAULT_SITE_URL) -> None:
    output = output.resolve()
    allowed = output == ROOT / "docs" or output.is_relative_to(ROOT / "artifacts")
    if not allowed:
        raise ValueError("Output must be this project's docs/ or a child of artifacts/.")
    parsed = urlparse(site_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("--site-url must be an absolute HTTP(S) URL")
    site_url = site_url.rstrip("/") + "/"
    required = ["static/games/demon-king/game.js", "static/games/shooter/game.html", "static/portfolio/project3-gameplay.webp", "static/portfolio/og-portfolio.png"]
    for name in required:
        if not (ROOT / name).is_file():
            raise FileNotFoundError(f"Missing {name}; build the game demos and media first.")
    output.mkdir(parents=True, exist_ok=True)
    # Keep the root itself so a local HTTP server with this cwd can keep running.
    for child in output.iterdir():
        if not child.resolve().is_relative_to(output):
            raise ValueError(f"Refusing to remove an outside target: {child}")
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()
    html = replace_flask_urls((ROOT / "templates/index.html").read_text(encoding="utf-8"), site_url)
    if "{{" in html or "url_for(" in html:
        raise ValueError("Unresolved template syntax")
    (output / "index.html").write_text(html, encoding="utf-8")
    shutil.copytree(ROOT / "static", output / "static")
    (output / "demos").mkdir()
    for name in ["pacman.html", "skydiving.html"]:
        shutil.copy2(ROOT / "demos" / name, output / "demos" / name)
    # Stable game file names need a content revision when publishing updates.
    for page in output.rglob('*.html'):
        def version_asset(match):
            prefix, url, suffix = match.groups()
            parsed_asset = urlparse(url)
            if parsed_asset.scheme or parsed_asset.netloc or Path(parsed_asset.path).suffix not in {'.css', '.js'}:
                return match.group(0)
            asset = (page.parent / unquote(parsed_asset.path)).resolve()
            if not asset.is_relative_to(output) or not asset.is_file():
                return match.group(0)
            query = dict(parse_qsl(parsed_asset.query))
            query['v'] = hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
            return prefix + urlunparse(parsed_asset._replace(query=urlencode(query))) + suffix
        text = page.read_text(encoding='utf-8')
        text = re.sub(r'((?:src|href)=[\'"])([^\'"]+)([\'"])', version_asset, text)
        page.write_text(text, encoding='utf-8')
    (output / ".nojekyll").write_text("", encoding="utf-8")
    (output / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {site_url}sitemap.xml\n", encoding="utf-8")
    (output / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{site_url}</loc></url></urlset>\n', encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "docs")
    parser.add_argument("--site-url", default=DEFAULT_SITE_URL)
    args = parser.parse_args()
    build(args.output, args.site_url)
    print(f"Built {args.output.resolve()} for {args.site_url}")
