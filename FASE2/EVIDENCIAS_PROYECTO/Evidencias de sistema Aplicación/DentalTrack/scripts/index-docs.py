"""Regenerate the human index from the documents actually retained."""
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "docs"
text = "# Índice documental\n\nEmpieza por [estado actual](PROJECT_STATUS.md), [mapa de carpetas](../MAPA_DEL_PROYECTO.md) y [cómo trabajamos con IA](agente/COMO_TRABAJAMOS_CON_IA.md). Producto → contratos → diseño → revisión distinguen objetivo, tarea, composición y comprobación. Arquitectura y ADR explican decisiones; académico conserva el material de la asignatura.\n\n"
for category in ("producto", "diseno", "arquitectura", "adr", "education", "operacion", "academico", "agente"):
    text += f"## {category}\n\n"
    for file in sorted((root / category).rglob("*")):
        if not file.is_file() or file.suffix.lower() not in (".md", ".pdf", ".xlsx") or "visor" in file.parts:
            continue
        path = file.relative_to(root).as_posix()
        title = file.stem
        if file.suffix == ".md":
            title = next((line[2:].strip() for line in file.read_text(encoding="utf-8").splitlines() if line.startswith("# ")), title)
        text += f"- [{title}](<{path}>): `{path}`.\n"
    text += "\n"
text += "## General\n\n[Plan de cierre](PLAN_DE_CIERRE.md) · [Estado actual](PROJECT_STATUS.md). Las capturas son temporales. El ZIP de arquitectura es el paquete explícito para compartir el mapa; docs permanece local e ignorada por Git.\n"
(root / "README.md").write_text(text, encoding="utf-8")
