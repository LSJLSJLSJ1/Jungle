"""Check every local HTML/CSS asset path in a generated Pages build."""
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1] / 'docs'
failures = []
references = 0


def check(source, value):
    global references
    parsed = urlparse(value)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return
    references += 1
    if parsed.path.startswith('/'):
        failures.append(f'{source.relative_to(ROOT)}: root-relative path breaks project hosting: {value}')
        return
    target = (source.parent / unquote(parsed.path)).resolve()
    if not target.is_relative_to(ROOT) or not target.exists():
        failures.append(f'{source.relative_to(ROOT)}: missing local resource: {value}')


class Links(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.source = source

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in {'src', 'href', 'poster'} and value:
                check(self.source, value)


for source in ROOT.rglob('*.html'):
    html = source.read_text(encoding='utf-8')
    if '{{' in html:
        failures.append(f'{source.relative_to(ROOT)}: unresolved template')
    Links(source).feed(html)
for source in ROOT.rglob('*.css'):
    for value in re.findall(r'url\([\s\'"]*([^\)\'"\s]+)', source.read_text(encoding='utf-8')):
        check(source, value)
if failures:
    raise SystemExit('\n'.join(failures))
print(f'PASS: {references} local HTML/CSS references resolve under the project subpath.')
