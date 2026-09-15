import argparse
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "assets" / "canva-songbook"
RUNTIME_POPPLER = Path.home() / ".cache" / "codex-runtimes" / "codex-primary-runtime" / "dependencies" / "native" / "poppler" / "Library" / "bin" / "pdftoppm.exe"


def find_pdftoppm() -> str:
    if RUNTIME_POPPLER.exists():
        return str(RUNTIME_POPPLER)
    found = shutil.which("pdftoppm")
    if found:
        return found
    raise SystemExit("pdftoppm was not found. Install Poppler or use the bundled Codex runtime.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Render a Canva songbook PDF into per-page PNG files.")
    parser.add_argument("pdf", type=Path, help="Path to the PDF exported from Canva.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output folder for page-XX.png files.")
    parser.add_argument("--dpi", type=int, default=220, help="Render resolution. 220 is good for preview and print.")
    parser.add_argument("--clean", action="store_true", help="Remove existing page-*.png files before rendering.")
    args = parser.parse_args()

    pdf_path = args.pdf.resolve()
    output_dir = args.output.resolve()

    if not pdf_path.exists():
      raise SystemExit(f"PDF not found: {pdf_path}")

    output_dir.mkdir(parents=True, exist_ok=True)

    if args.clean:
        for old_page in output_dir.glob("page-*.png"):
            old_page.unlink()

    prefix = output_dir / "page"
    subprocess.run(
        [find_pdftoppm(), "-png", "-r", str(args.dpi), str(pdf_path), str(prefix)],
        check=True,
    )

    rendered = sorted(output_dir.glob("page-*.png"))
    for index, path in enumerate(rendered, start=1):
        target = output_dir / f"page-{index:02}.png"
        if path != target:
            if target.exists():
                target.unlink()
            path.rename(target)

    final_pages = sorted(output_dir.glob("page-*.png"))
    print(f"Rendered {len(final_pages)} pages into {output_dir}")


if __name__ == "__main__":
    main()
