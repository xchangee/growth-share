#!/usr/bin/env python3

"""Build the public demo's stylized SVG avatars and WebGL atlas.

The only visual inputs are ``avatar-sources/open-source-avatar-master-01.png``
through ``-04.png``: four 8x8 contact sheets containing 256 fictional portraits
generated specifically for this repository. Deterministic, subtle geometric
variants expand those source portraits into 674 unique ``profile-*`` assets;
the remaining 30 atlas slots stay paper-colored.

Generation is staged in a temporary directory and validated before the
existing generated SVG set is replaced.  Cleanup deliberately refuses to run
when the output directory contains anything other than a generated demo or
profile SVG.
"""

from __future__ import annotations

import hashlib
import os
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

import vtracer
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
SOURCE_DIR = SCRIPT_DIR / "avatar-sources"
SVG_DIR = PROJECT_ROOT / "src" / "assets" / "synthetic-avatars"
ATLAS_PATH = PROJECT_ROOT / "public" / "assets" / "avatar-atlas.png"

SOURCE_SHEETS = tuple(
    SOURCE_DIR / f"open-source-avatar-master-{index:02d}.png"
    for index in range(1, 5)
)
SOURCE_COLUMNS = 8
SOURCE_ROWS = 8
SOURCE_CAPACITY = SOURCE_COLUMNS * SOURCE_ROWS
SOURCE_PORTRAIT_COUNT = SOURCE_CAPACITY * len(SOURCE_SHEETS)
PROFILE_COUNT = 674

# Each source portrait is reused at most three times. These variants preserve
# the portrait while ensuring every generated SVG has distinct path geometry.
VARIANT_TRANSFORMS = (
    (-2.8, 0.955, -5, -3, False),
    (-2.2, 0.975, 3, -5, True),
    (-1.5, 0.990, -4, 4, False),
)

MASTER_SIZE = 512
SOURCE_FRAME_TRIM = 0.09
CONTENT_INSET = 42
CONTENT_CORNER = 52
FRAME_INSET = 18
FRAME_CORNER = 34
FRAME_STROKE_WIDTH = 8

SVG_PAPER = "#e4be8b"
SVG_INK = "#a2543c"
ATLAS_PAPER = "#fbf6e8"
ATLAS_INK = "#17364f"
ATLAS_COLUMNS = 32
ATLAS_ROWS = 22
ATLAS_CELL_SIZE = 96
ATLAS_SIZE = (ATLAS_COLUMNS * ATLAS_CELL_SIZE, ATLAS_ROWS * ATLAS_CELL_SIZE)

GENERATED_SVG_NAME = re.compile(r"(?:demo|profile)-\d{4}\.svg\Z")
SAFE_TRANSLATE = re.compile(
    r"translate\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)\Z"
)
EXPECTED_PROFILE_NAMES = tuple(
    f"profile-{index:04d}.svg" for index in range(1, PROFILE_COUNT + 1)
)
FORBIDDEN_SVG_TOKENS = ("<text", "<image", "<metadata", "href=")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def local_tag(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def crop_sheet_cell(sheet: Image.Image, cell_index: int) -> Image.Image:
    column = cell_index % SOURCE_COLUMNS
    row = cell_index // SOURCE_COLUMNS
    left = round(column * sheet.width / SOURCE_COLUMNS)
    right = round((column + 1) * sheet.width / SOURCE_COLUMNS)
    top = round(row * sheet.height / SOURCE_ROWS)
    bottom = round((row + 1) * sheet.height / SOURCE_ROWS)
    return sheet.crop((left, top, right, bottom)).convert("RGB")


def otsu_threshold(grayscale: Image.Image) -> int:
    histogram = grayscale.histogram()
    total = sum(histogram)
    weighted_total = sum(value * count for value, count in enumerate(histogram))
    background_weight = 0
    background_sum = 0
    best_variance = -1.0
    best_threshold = 160

    for threshold, count in enumerate(histogram):
        background_weight += count
        if background_weight == 0:
            continue
        foreground_weight = total - background_weight
        if foreground_weight == 0:
            break
        background_sum += threshold * count
        background_mean = background_sum / background_weight
        foreground_mean = (weighted_total - background_sum) / foreground_weight
        between_class_variance = (
            background_weight
            * foreground_weight
            * (background_mean - foreground_mean) ** 2
        )
        if between_class_variance > best_variance:
            best_variance = between_class_variance
            best_threshold = threshold

    # These two-color sheets place warm-red ink near L=105 and paper near
    # L=197.  The clamp prevents paper texture or an unusually dark portrait
    # from pushing the adaptive threshold into a destructive extreme.
    return max(128, min(184, best_threshold))


def octagon_mask(size: tuple[int, int], corner: int) -> Image.Image:
    width, height = size
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).polygon(
        (
            (corner, 0),
            (width - corner, 0),
            (width, corner),
            (width, height - corner),
            (width - corner, height),
            (corner, height),
            (0, height - corner),
            (0, corner),
        ),
        fill=255,
    )
    return mask


def normalized_mask(cell: Image.Image) -> Image.Image:
    """Discard the generated cell frame and add the canonical octagon."""
    trim_x = max(1, round(cell.width * SOURCE_FRAME_TRIM))
    trim_y = max(1, round(cell.height * SOURCE_FRAME_TRIM))
    if trim_x * 2 >= cell.width or trim_y * 2 >= cell.height:
        raise ValueError(f"Source cell is too small to trim: {cell.size}")

    content = cell.crop(
        (trim_x, trim_y, cell.width - trim_x, cell.height - trim_y)
    ).resize((MASTER_SIZE, MASTER_SIZE), Image.Resampling.LANCZOS)
    grayscale = ImageOps.autocontrast(
        ImageOps.grayscale(content).filter(ImageFilter.MedianFilter(3)), cutoff=1
    )
    threshold = otsu_threshold(grayscale)
    source_mask = grayscale.point(
        lambda value: 255 if value <= threshold else 0,
        mode="L",
    )
    # Close tiny antialiasing gaps, then reopen single-pixel paper dust.  This
    # keeps facial linework and halftone while presenting vtracer a clean mask.
    source_mask = source_mask.filter(ImageFilter.MaxFilter(3)).filter(
        ImageFilter.MinFilter(3)
    )

    content_size = MASTER_SIZE - CONTENT_INSET * 2
    source_mask = source_mask.resize(
        (content_size, content_size), Image.Resampling.LANCZOS
    )
    source_mask = ImageChops.multiply(
        source_mask,
        octagon_mask((content_size, content_size), CONTENT_CORNER),
    )

    mask = Image.new("L", (MASTER_SIZE, MASTER_SIZE), 0)
    mask.paste(source_mask, (CONTENT_INSET, CONTENT_INSET))

    frame_start = FRAME_INSET + FRAME_CORNER
    frame_end = MASTER_SIZE - FRAME_INSET - FRAME_CORNER
    frame_points = (
        (FRAME_INSET, frame_start),
        (frame_start, FRAME_INSET),
        (frame_end, FRAME_INSET),
        (MASTER_SIZE - FRAME_INSET, frame_start),
        (MASTER_SIZE - FRAME_INSET, frame_end),
        (frame_end, MASTER_SIZE - FRAME_INSET),
        (frame_start, MASTER_SIZE - FRAME_INSET),
        (FRAME_INSET, frame_end),
        (FRAME_INSET, frame_start),
    )
    ImageDraw.Draw(mask).line(
        frame_points,
        fill=255,
        width=FRAME_STROKE_WIDTH,
        joint="curve",
    )
    return mask


def variant_mask(mask: Image.Image, profile_index: int) -> Image.Image:
    """Apply one deterministic crop-safe transform to a normalized portrait."""
    variant_index = profile_index // SOURCE_PORTRAIT_COUNT
    angle, scale, shift_x, shift_y, mirror = VARIANT_TRANSFORMS[variant_index]
    transformed = ImageOps.mirror(mask) if mirror else mask

    scaled_size = max(1, round(MASTER_SIZE * scale))
    scaled = transformed.resize(
        (scaled_size, scaled_size), Image.Resampling.LANCZOS
    )
    canvas = Image.new("L", (MASTER_SIZE, MASTER_SIZE), 0)
    left = (MASTER_SIZE - scaled_size) // 2 + shift_x
    top = (MASTER_SIZE - scaled_size) // 2 + shift_y
    canvas.paste(scaled, (left, top))
    return canvas.rotate(
        angle,
        resample=Image.Resampling.BICUBIC,
        expand=False,
        fillcolor=0,
    )


def render_two_color(mask: Image.Image, ink: str, paper: str) -> Image.Image:
    return Image.composite(
        Image.new("RGB", mask.size, ink),
        Image.new("RGB", mask.size, paper),
        mask,
    )


def trace_mask(mask: Image.Image, raster_path: Path, raw_svg_path: Path) -> None:
    # VTracer's binary mode treats black as the foreground path.
    render_two_color(mask, "#000000", "#ffffff").save(raster_path, optimize=True)
    vtracer.convert_image_to_svg_py(
        str(raster_path),
        str(raw_svg_path),
        colormode="binary",
        hierarchical="stacked",
        mode="spline",
        filter_speckle=5,
        corner_threshold=60,
        length_threshold=3.0,
        path_precision=2,
    )


def sanitize_svg(raw_svg_path: Path, destination: Path) -> None:
    """Keep only vtracer path geometry and apply the approved two colors."""
    root = ET.parse(raw_svg_path).getroot()
    paths: list[tuple[str, str | None, str | None, str | None]] = []
    for element in root.iter():
        if local_tag(element.tag) != "path":
            continue
        path_data = element.attrib.get("d", "").strip()
        if not path_data:
            continue
        transform = element.attrib.get("transform")
        if transform is not None and SAFE_TRANSLATE.fullmatch(transform) is None:
            raise ValueError(
                f"VTracer produced an unsafe transform for {destination.name}: "
                f"{transform}"
            )
        paths.append(
            (
                path_data,
                element.attrib.get("fill-rule"),
                element.attrib.get("clip-rule"),
                transform,
            )
        )
    if not paths:
        raise ValueError(f"VTracer produced no path geometry for {destination.name}")

    lines = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" '
        'viewBox="0 0 512 512" aria-hidden="true" focusable="false">',
        f'  <rect width="512" height="512" fill="{SVG_PAPER}"/>',
    ]
    for path_data, fill_rule, clip_rule, transform in paths:
        attributes = [f'fill="{SVG_INK}"', f'd="{path_data}"']
        if fill_rule in {"evenodd", "nonzero"}:
            attributes.append(f'fill-rule="{fill_rule}"')
        if clip_rule in {"evenodd", "nonzero"}:
            attributes.append(f'clip-rule="{clip_rule}"')
        if transform is not None:
            attributes.append(f'transform="{transform}"')
        lines.append(f"  <path {' '.join(attributes)}/>")
    lines.append("</svg>")
    destination.write_text("\n".join(lines) + "\n", encoding="utf-8")


def validate_source_sheets() -> tuple[tuple[int, int], ...]:
    found_names = {
        path.name for path in SOURCE_DIR.glob("*.png") if path.is_file()
    }
    expected_names = {path.name for path in SOURCE_SHEETS}
    if found_names != expected_names:
        raise SystemExit(
            "Expected exactly the four open-source avatar masters; found: "
            f"{', '.join(sorted(found_names)) or 'none'}"
        )

    dimensions: list[tuple[int, int]] = []
    for source in SOURCE_SHEETS:
        try:
            with Image.open(source) as image:
                image.verify()
            with Image.open(source) as image:
                if image.format != "PNG":
                    raise SystemExit(f"Source is not PNG: {source}")
                if image.width != image.height or image.width < 1024:
                    raise SystemExit(
                        "Source must be a square 8x8 contact sheet at least 1024px: "
                        f"{source} is {image.size}"
                    )
                dimensions.append(image.size)
        except (OSError, SyntaxError) as error:
            raise SystemExit(f"Unreadable source sheet {source}: {error}") from error
    return tuple(dimensions)


def preflight_svg_output() -> tuple[Path, ...]:
    expected_dir = PROJECT_ROOT / "src" / "assets" / "synthetic-avatars"
    if SVG_DIR != expected_dir or SVG_DIR.parent != PROJECT_ROOT / "src" / "assets":
        raise SystemExit(f"Refusing unsafe SVG output directory: {SVG_DIR}")
    if not SVG_DIR.exists():
        return ()
    if not SVG_DIR.is_dir() or SVG_DIR.is_symlink():
        raise SystemExit(f"SVG output must be a real directory: {SVG_DIR}")

    removable: list[Path] = []
    for entry in sorted(SVG_DIR.iterdir(), key=lambda path: path.name):
        if (
            entry.is_symlink()
            or not entry.is_file()
            or GENERATED_SVG_NAME.fullmatch(entry.name) is None
        ):
            raise SystemExit(
                "Refusing cleanup because the generated SVG directory contains "
                f"an unrelated entry: {entry}"
            )
        removable.append(entry)
    return tuple(removable)


def validate_svg(path: Path) -> str:
    content = path.read_text(encoding="utf-8")
    lowered = content.lower()
    forbidden = [token for token in FORBIDDEN_SVG_TOKENS if token in lowered]
    if forbidden:
        raise ValueError(f"Forbidden SVG content in {path.name}: {forbidden}")
    root = ET.fromstring(content)
    if local_tag(root.tag) != "svg" or root.attrib.get("viewBox") != "0 0 512 512":
        raise ValueError(f"Invalid SVG root in {path.name}")
    tags = [local_tag(element.tag) for element in root.iter()]
    if set(tags) - {"svg", "rect", "path"}:
        raise ValueError(f"Unexpected SVG elements in {path.name}: {set(tags)}")
    rects = [element for element in root if local_tag(element.tag) == "rect"]
    paths = [element for element in root if local_tag(element.tag) == "path"]
    if len(rects) != 1 or rects[0].attrib.get("fill") != SVG_PAPER:
        raise ValueError(f"Missing paper background in {path.name}")
    if not paths or any(element.attrib.get("fill") != SVG_INK for element in paths):
        raise ValueError(f"Invalid ink path in {path.name}")
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def validate_staged_outputs(svg_directory: Path, atlas_path: Path) -> tuple[str, str]:
    actual_names = {path.name for path in svg_directory.glob("*.svg")}
    expected_names = set(EXPECTED_PROFILE_NAMES)
    if actual_names != expected_names:
        missing = sorted(expected_names - actual_names)
        unexpected = sorted(actual_names - expected_names)
        raise ValueError(
            f"SVG filename mismatch; missing={missing[:1]} unexpected={unexpected[:1]}"
        )

    svg_hashes = {
        name: validate_svg(svg_directory / name) for name in EXPECTED_PROFILE_NAMES
    }
    if len(set(svg_hashes.values())) != PROFILE_COUNT:
        duplicates: dict[str, list[str]] = {}
        for name, digest in svg_hashes.items():
            duplicates.setdefault(digest, []).append(name)
        first_duplicate = next(names for names in duplicates.values() if len(names) > 1)
        raise ValueError(f"Generated SVGs are not unique: {first_duplicate}")

    collection = hashlib.sha256()
    for name in EXPECTED_PROFILE_NAMES:
        collection.update(name.encode("ascii"))
        collection.update(b"\0")
        collection.update(svg_hashes[name].encode("ascii"))
        collection.update(b"\n")

    with Image.open(atlas_path) as atlas:
        atlas.load()
        if atlas.format != "PNG" or atlas.size != ATLAS_SIZE:
            raise ValueError(
                f"Atlas must be PNG {ATLAS_SIZE[0]}x{ATLAS_SIZE[1]}: "
                f"format={atlas.format} size={atlas.size}"
            )
        rgb_atlas = atlas.convert("RGB")
        paper = Image.new("RGB", (ATLAS_CELL_SIZE, ATLAS_CELL_SIZE), ATLAS_PAPER)
        for index in range(PROFILE_COUNT):
            left = (index % ATLAS_COLUMNS) * ATLAS_CELL_SIZE
            top = (index // ATLAS_COLUMNS) * ATLAS_CELL_SIZE
            cell = rgb_atlas.crop(
                (left, top, left + ATLAS_CELL_SIZE, top + ATLAS_CELL_SIZE)
            )
            if ImageChops.difference(cell, paper).getbbox() is None:
                raise ValueError(f"Atlas profile slot {index + 1} is blank")
        for index in range(PROFILE_COUNT, ATLAS_COLUMNS * ATLAS_ROWS):
            left = (index % ATLAS_COLUMNS) * ATLAS_CELL_SIZE
            top = (index // ATLAS_COLUMNS) * ATLAS_CELL_SIZE
            cell = rgb_atlas.crop(
                (left, top, left + ATLAS_CELL_SIZE, top + ATLAS_CELL_SIZE)
            )
            if ImageChops.difference(cell, paper).getbbox() is not None:
                raise ValueError(f"Atlas padding slot {index + 1} is not paper-only")

    return collection.hexdigest(), sha256(atlas_path)


def build_staged_outputs(stage: Path) -> tuple[Path, Path]:
    staged_svg_dir = stage / "svg"
    staged_raster_dir = stage / "raster"
    staged_raw_dir = stage / "raw-svg"
    staged_svg_dir.mkdir()
    staged_raster_dir.mkdir()
    staged_raw_dir.mkdir()
    staged_atlas = stage / "avatar-atlas.png"

    atlas = Image.new("RGB", ATLAS_SIZE, ATLAS_PAPER)
    sheets: list[Image.Image] = []
    for source in SOURCE_SHEETS:
        with Image.open(source) as opened_sheet:
            sheets.append(opened_sheet.convert("RGB"))

    for profile_index in range(PROFILE_COUNT):
        profile_number = profile_index + 1
        profile_name = f"profile-{profile_number:04d}"
        # A coprime stride avoids presenting the same source ordering in
        # each block while retaining deterministic reproducibility.
        source_index = (profile_index * 37 + 11) % SOURCE_PORTRAIT_COUNT
        sheet_index = source_index // SOURCE_CAPACITY
        cell_index = source_index % SOURCE_CAPACITY
        mask = variant_mask(
            normalized_mask(crop_sheet_cell(sheets[sheet_index], cell_index)),
            profile_index,
        )

        ink_bounds = mask.getbbox()
        ink_coverage = sum(
            value * count for value, count in enumerate(mask.histogram())
        ) / (MASTER_SIZE * MASTER_SIZE * 255)
        if ink_bounds is None or not 0.015 <= ink_coverage <= 0.75:
            raise ValueError(
                f"Implausible mask for {profile_name}: coverage={ink_coverage:.4f}"
            )

        raster_path = staged_raster_dir / f"{profile_name}.png"
        raw_svg_path = staged_raw_dir / f"{profile_name}.svg"
        svg_path = staged_svg_dir / f"{profile_name}.svg"
        trace_mask(mask, raster_path, raw_svg_path)
        sanitize_svg(raw_svg_path, svg_path)

        atlas_mask = mask.resize(
            (ATLAS_CELL_SIZE, ATLAS_CELL_SIZE), Image.Resampling.LANCZOS
        )
        atlas_cell = render_two_color(atlas_mask, ATLAS_INK, ATLAS_PAPER)
        atlas.paste(
            atlas_cell,
            (
                (profile_index % ATLAS_COLUMNS) * ATLAS_CELL_SIZE,
                (profile_index // ATLAS_COLUMNS) * ATLAS_CELL_SIZE,
            ),
        )
    atlas.save(staged_atlas, format="PNG", optimize=True)
    return staged_svg_dir, staged_atlas


def commit_outputs(staged_svg_dir: Path, staged_atlas: Path) -> None:
    # Recheck immediately before deletion in case another process wrote here
    # during the comparatively expensive tracing stage.
    removable = preflight_svg_output()
    SVG_DIR.mkdir(parents=True, exist_ok=True)
    for path in removable:
        path.unlink()
    for name in EXPECTED_PROFILE_NAMES:
        os.replace(staged_svg_dir / name, SVG_DIR / name)

    ATLAS_PATH.parent.mkdir(parents=True, exist_ok=True)
    os.replace(staged_atlas, ATLAS_PATH)


def print_hashes(svg_collection_hash: str, atlas_hash: str) -> None:
    print(f"SHA256 {atlas_hash}  {ATLAS_PATH.relative_to(PROJECT_ROOT)}")
    print(f"SHA256 {svg_collection_hash}  synthetic-avatars-collection")


def reexec_on_supported_python() -> None:
    """Avoid a native vtracer crash observed with its current Python 3.14 wheel."""
    if sys.version_info < (3, 14):
        return
    if os.environ.get("GROWTH_AVATAR_PYTHON_REEXEC") == "1":
        raise SystemExit("vtracer requires Python 3.13 for this generator")

    environment = os.environ.copy()
    environment["GROWTH_AVATAR_PYTHON_REEXEC"] = "1"
    command = (
        "uv",
        "run",
        "--python",
        "3.13",
        "--with-requirements",
        str(SCRIPT_DIR / "requirements-avatar.txt"),
        "python",
        str(Path(__file__).resolve()),
    )
    print(
        f"Python {sys.version_info.major}.{sys.version_info.minor} detected; "
        "re-running with Python 3.13 for vtracer compatibility.",
        flush=True,
    )
    raise SystemExit(subprocess.run(command, env=environment, check=False).returncode)


def main() -> None:
    reexec_on_supported_python()
    dimensions = validate_source_sheets()
    preflight_svg_output()
    dimension_summary = ", ".join(
        f"{width}x{height}" for width, height in sorted(set(dimensions))
    )
    print(
        f"Validated {len(SOURCE_SHEETS)} open-source source sheets as 8x8 grids "
        f"(source sizes: {dimension_summary})."
    )

    with tempfile.TemporaryDirectory(prefix="growth-stylized-avatars-") as temp:
        staged_svg_dir, staged_atlas = build_staged_outputs(Path(temp))
        svg_collection_hash, atlas_hash = validate_staged_outputs(
            staged_svg_dir, staged_atlas
        )
        commit_outputs(staged_svg_dir, staged_atlas)

    # Validate the committed files, not just the temporary build.
    committed_collection_hash, committed_atlas_hash = validate_staged_outputs(
        SVG_DIR, ATLAS_PATH
    )
    if (committed_collection_hash, committed_atlas_hash) != (
        svg_collection_hash,
        atlas_hash,
    ):
        raise SystemExit("Committed output hashes differ from the validated staged build")

    print(
        f"Built and validated {PROFILE_COUNT} unique SVG avatars and "
        f"{ATLAS_PATH.relative_to(PROJECT_ROOT)} "
        f"({ATLAS_SIZE[0]}x{ATLAS_SIZE[1]}, {ATLAS_COLUMNS}x{ATLAS_ROWS} cells)."
    )
    print_hashes(committed_collection_hash, committed_atlas_hash)


if __name__ == "__main__":
    main()
