#!/usr/bin/env python3
# dump_vite_project.py
"""
React/Vite loyihasidagi barcha tegishli kod fayllarini bitta .txt faylga yig'adi.

Misol:
    python dump_vite_project.py --root . --out project-dump.txt --linenumbers
"""

# python .\script.py --root "E:\DEVELOP2\REACT\map-test" --out "E:\DEVELOP2\REACT\map-test\code-dump.txt" --linenumbers


import argparse
import os
from pathlib import Path
from typing import Iterable, Set

DEFAULT_INCLUDE_EXTS = {
    # Frontend code
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    # Styles
    ".css", ".scss", ".sass", ".less",
    # Markup
    ".html",
    # Config / meta
    ".json", ".yml", ".yaml", ".env", ".env.example",
    ".md", ".toml",
    # Scripts
    ".sh", ".ps1",
    # Vite/ESLint/Prettier configs may be JS/TS already covered
}

DEFAULT_EXCLUDE_DIRS = {
    "node_modules", "dist", "build", ".git", ".idea", ".vscode",
    ".next", ".turbo", ".cache", ".parcel-cache", ".husky",
    ".pnpm-store", ".yarn", ".changeset", "coverage", "out",
}

# Juda katta yoki kerak bo'lmagan fayllar
DEFAULT_EXCLUDE_FILES = {
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
}

HEADER_LINE = "=" * 80


def looks_binary(path: Path, sample_size: int = 2048) -> bool:
    """Oddiy tekshiruv: 0x00 mavjudligi yoki dekodlash muammosi bo'yicha binarni aniqlash."""
    try:
        with open(path, "rb") as f:
            chunk = f.read(sample_size)
        if b"\x00" in chunk:
            return True
        # UTF-8 ga o‘qib ko‘ramiz
        chunk.decode("utf-8")
        return False
    except Exception:
        return True


def normalize_exts(exts_str: str) -> Set[str]:
    result = set()
    for raw in exts_str.split(","):
        s = raw.strip()
        if not s:
            continue
        if not s.startswith("."):
            s = "." + s
        result.add(s.lower())
    return result


def walk_files(root: Path, include_exts: Set[str], exclude_dirs: Set[str]) -> Iterable[Path]:
    """Katalogni kezib, mos keladigan fayllarni beradi."""
    for dirpath, dirnames, filenames in os.walk(root):
        # Exclude directories in-place (tezlik uchun)
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs and not d.startswith(".DS")]
        for name in filenames:
            p = Path(dirpath) / name
            ext = p.suffix.lower()
            # .env kabi ko‘p nuqtali fayllar uchun suffix bo‘lmasligi mumkin, alohida tekshiramiz
            is_special_env = p.name in {".env", ".env.local", ".env.development", ".env.production", ".env.example"}
            if ext in include_exts or is_special_env:
                yield p


def should_skip_file(p: Path) -> bool:
    if p.name in DEFAULT_EXCLUDE_FILES:
        return True
    # Mac metadata
    if p.name == ".DS_Store":
        return True
    return False


def dump_files(
    files: Iterable[Path],
    out_path: Path,
    add_line_numbers: bool = False,
) -> int:
    count = 0
    with open(out_path, "w", encoding="utf-8", newline="\n") as out:
        for fp in sorted(files, key=lambda x: str(x).lower()):
            if should_skip_file(fp):
                continue
            if looks_binary(fp):
                # Binar yoki o‘qib bo‘lmaydigan fayllar tashlab ketiladi
                continue
            try:
                text = fp.read_text(encoding="utf-8", errors="replace")
            except Exception as e:
                # O‘qib bo‘lmasa tashlab ketamiz
                continue

            rel = fp.resolve()
            size = fp.stat().st_size
            out.write(f"{HEADER_LINE}\n")
            out.write(f"FILE: {rel}\nSIZE: {size} bytes\n")
            out.write(f"{HEADER_LINE}\n")

            if add_line_numbers:
                for i, line in enumerate(text.splitlines(), start=1):
                    out.write(f"{i:6d}: {line}\n")
            else:
                out.write(text.rstrip("\n") + "\n")

            out.write("\n\n")
            count += 1
    return count


def main():
    parser = argparse.ArgumentParser(
        description="React/Vite loyihasi kodlarini bitta .txt faylga yig'ish skripti."
    )
    parser.add_argument(
        "--root", type=str, default=".",
        help="Loyiha ildiz papkasi (default: .)"
    )
    parser.add_argument(
        "--out", type=str, default="project-dump.txt",
        help="Chiqish fayli nomi (default: project-dump.txt)"
    )
    parser.add_argument(
        "--include", type=str, default=",".join(sorted(DEFAULT_INCLUDE_EXTS)),
        help="Kiritiladigan kengaytmalar vergul bilan (masalan: .js,.jsx,.ts,.tsx,.css,.scss,.html,.json)"
    )
    parser.add_argument(
        "--exclude-dirs", type=str, default=",".join(sorted(DEFAULT_EXCLUDE_DIRS)),
        help="Tashlab ketiladigan kataloglar (vergul bilan)"
    )
    parser.add_argument(
        "--linenumbers", action="store_true",
        help="Har bir faylga satr raqamlari qo'shilsin"
    )

    args = parser.parse_args()

    root = Path(args.root).resolve()
    out_path = Path(args.out).resolve()
    include_exts = normalize_exts(args.include)
    exclude_dirs = {d.strip() for d in args.exclude_dirs.split(",") if d.strip()}

    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Root katalog topilmadi yoki katalog emas: {root}")

    # Chiqish faylini o'zimiz tanglayotgan ro'yxatdan chiqaramiz (o'z-o'zini yutib yubormasin)
    if out_path.is_file():
        try:
            out_path.unlink()
        except Exception:
            pass

    print(f"[i] Root: {root}")
    print(f"[i] Out:  {out_path}")
    print(f"[i] Include extensions: {sorted(include_exts)}")
    print(f"[i] Exclude dirs: {sorted(exclude_dirs)}")
    print("[i] Fayllar yig'ilmoqda...")

    files = list(walk_files(root, include_exts, exclude_dirs))

    # Chiqish faylini ro'yxatdan olib tashlash
    files = [f for f in files if f.resolve() != out_path]

    total = dump_files(files, out_path, add_line_numbers=args.linenumbers)

    print(f"[✓] Yakunlandi. {total} ta fayl '{out_path}' ichiga yig'ildi.")


if __name__ == "__main__":
    main()
