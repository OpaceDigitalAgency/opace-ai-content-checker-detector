#!/usr/bin/env python3
"""Normalise an existing Python sdist into a reproducible tar.gz archive."""

from __future__ import annotations

import copy
import gzip
import sys
import tarfile
from pathlib import Path


EPOCH = 1_787_673_600


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: repack-python-sdist.py INPUT.tar.gz OUTPUT.tar.gz")
    source = Path(sys.argv[1]).resolve()
    destination = Path(sys.argv[2]).resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(source, "r:gz") as archive:
        members = sorted(archive.getmembers(), key=lambda member: member.name)
        with destination.open("wb") as raw:
            with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=EPOCH) as compressed:
                with tarfile.open(fileobj=compressed, mode="w", format=tarfile.PAX_FORMAT) as output:
                    for member in members:
                        normalised = copy.copy(member)
                        normalised.mtime = EPOCH
                        normalised.uid = 0
                        normalised.gid = 0
                        normalised.uname = "root"
                        normalised.gname = "root"
                        normalised.pax_headers = {
                            key: value for key, value in member.pax_headers.items() if key in {"path", "linkpath"}
                        }
                        payload = archive.extractfile(member) if member.isfile() else None
                        output.addfile(normalised, payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
