"""Check local routes, fragment targets, assets, metadata, and bilingual content."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json, re

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
errors = []
documents = {}

class Document(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path, self.ids, self.links, self.images = path, set(), [], []
        self.locale_count = 0
    def handle_starttag(self, tag, attributes):
        values = dict(attributes)
        if 'id' in values:
            if values['id'] in self.ids:
                errors.append(f'{self.path.name}: duplicate id {values["id"]}')
            self.ids.add(values['id'])
        if 'data-en' in values or 'data-ja' in values:
            if not values.get('data-en') or not values.get('data-ja'):
                errors.append(f'{self.path.name}: missing bilingual text')
            self.locale_count += 1
        for attribute in ['href', 'src']:
            if values.get(attribute):
                self.links.append(values[attribute])
        if tag == 'img' and not values.get('alt'):
            errors.append(f'{self.path.name}: image without alternative text')

for path in dist.glob('*.html'):
    document = Document(path)
    document.feed(path.read_text())
    documents[path] = document
for path, document in documents.items():
    for link in document.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            continue
        target = dist / unquote(url.path.lstrip('/')) if url.path.startswith('/') else path.parent / unquote(url.path)
        if not url.path:
            target = path
        if target.is_dir():
            target /= 'index.html'
        target = target.resolve()
        if not target.exists():
            errors.append(f'{path.name}: missing local target {link}')
        elif url.fragment and target in documents and url.fragment not in documents[target].ids:
            errors.append(f'{path.name}: missing fragment {link}')
for link in re.findall(r'url\([\'"]?([^\)\'\"]+)', (dist / 'styles.css').read_text()):
    if not (dist / link).exists():
        errors.append(f'styles.css: missing asset {link}')
manifest = json.loads((root / '.openai/hosting.json').read_text())
assert manifest['static']['directory'] == 'dist'
assert (dist / 'assets/Taro_Nagata_Resume.pdf').read_bytes().startswith(b'%PDF')
assert (dist / 'assets/cloud-stability-figure9.png').read_bytes().startswith(b'\x89PNG')
assert documents[dist / 'index.html'].locale_count >= 50
if errors:
    raise SystemExit('\n'.join(errors))
print(f'OK: {len(documents)} HTML documents; local routes, fragments, CSS assets, PDF, research figure, and {documents[dist / "index.html"].locale_count} bilingual strings.')
