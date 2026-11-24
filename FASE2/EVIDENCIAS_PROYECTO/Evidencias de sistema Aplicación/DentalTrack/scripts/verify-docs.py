"""Validate local Markdown targets and fragments without making network requests."""
from pathlib import Path
import re
import sys
from urllib.parse import unquote

root = Path(__file__).resolve().parents[1]
files = list((root / "docs").rglob("*.md")) + [root / n for n in ("AGENTS.md", "README.md", "MAPA_DEL_PROYECTO.md")]
errors = []
links = 0
for file in files:
    if not file.exists():
        continue
    text = file.read_text(encoding="utf-8")
    for match in re.finditer(r"!?\[[^\]]*\]\((<[^>]+>|[^\n)]+)\)", text):
        url = match[1].strip("<>")
        if re.match(r"^[a-z]+:", url, re.I):
            continue
        path, _, fragment = url.partition("#")
        target = (file.parent / unquote(path)).resolve() if path else file
        links += 1
        if not target.exists():
            errors.append(f"{file.relative_to(root)}: {url}")
        elif fragment and target.suffix == ".md":
            headings = []
            for heading in re.findall(r"^#+\s+(.+)$", target.read_text(encoding="utf-8"), re.M):
                heading = re.sub(r"[^\w\- ]", "", heading.lower()).replace(" ", "-")
                headings.append(heading)
            if unquote(fragment) not in headings:
                errors.append(f"{file.relative_to(root)}: fragment {url}")
print(f"{len(files)} documentos, {links} enlaces locales, {len(errors)} errores")
for error in errors:
    print(error)
sys.exit(bool(errors))
