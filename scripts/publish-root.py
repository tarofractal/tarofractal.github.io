"""Mirror the built static site into the existing GitHub Pages main / source."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[1]
source = root / 'dist'
if not (source / 'index.html').is_file():
    raise SystemExit('dist/index.html is missing.')
count = 0
for path in source.rglob('*'):
    if not path.is_file():
        continue
    target = root / path.relative_to(source)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, target)
    count += 1
print(f'Copied {count} static files to the existing GitHub Pages publishing root.')
