#!/usr/bin/env python3
"""Parse the sitemap XML and emit a markdown summary for the Obsidian vault."""

from __future__ import annotations

import argparse
import os
import pathlib
import xml.etree.ElementTree as ET


def parse_sitemap(xml_path: pathlib.Path) -> list[tuple[str, str]]:
    """Return tuples of (URL, lastmod) from the sitemap."""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    entries: list[tuple[str, str]] = []
    for url in root.findall("sm:url", namespace):
        loc = url.find("sm:loc", namespace)
        lastmod = url.find("sm:lastmod", namespace)
        if loc is None or lastmod is None:
            continue
        entries.append((loc.text or "", lastmod.text or ""))
    return entries


def write_markdown(entries: list[tuple[str, str]], output_path: pathlib.Path) -> None:
    """Serialize the sitemap entries into a markdown note."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as out_file:
        out_file.write(
            "# Fold Engine Sitemap\n\n"
            "This note captures every canonical page from the sitemap so we can build"
            " individual vault notes for each URL.\n\n"
        )
        out_file.write("| Page | Last modified |\n")
        out_file.write("| --- | --- |\n")
        for url, lastmod in entries:
            anchor = url.split("/")[-2] or url.strip("/")
            out_file.write(f"| [{anchor}]({url}) | {lastmod} |\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate vault sitemap note.")
    default_site_output = os.environ.get("SITE_OUTPUT_DIR", ".unfold/site")
    parser.add_argument(
        "--input",
        type=pathlib.Path,
        default=pathlib.Path(default_site_output) / "sitemap.xml",
        help="Path to the sitemap XML.",
    )
    parser.add_argument(
        "--output",
        type=pathlib.Path,
        default=pathlib.Path("vault/sitemap.md"),
        help="Path for the generated markdown note.",
    )
    args = parser.parse_args()
    entries = parse_sitemap(args.input)
    write_markdown(entries, args.output)


if __name__ == "__main__":
    main()
