#!/usr/bin/env python3
from __future__ import annotations

import copy
import gzip
import io
import os
import subprocess
import sys
import tarfile
from pathlib import Path

EPOCH = 1_787_745_600


def normalise_sdist(path: Path) -> None:
    entries = []
    with tarfile.open(path, "r:gz") as source:
        for member in sorted(source.getmembers(), key=lambda item: item.name):
            payload = source.extractfile(member).read() if member.isfile() else None
            item = copy.copy(member)
            item.uid = item.gid = 0
            item.uname = item.gname = ""
            item.mtime = EPOCH
            item.pax_headers = {}
            entries.append((item, payload))
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive, mode="w", format=tarfile.USTAR_FORMAT) as target:
        for member, payload in entries:
            target.addfile(member, io.BytesIO(payload) if payload is not None else None)
    with path.open("wb") as output, gzip.GzipFile(filename="", mode="wb", fileobj=output, mtime=EPOCH, compresslevel=9) as compressed:
        compressed.write(archive.getvalue())


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: build-local-candidate.py OUTPUT_DIRECTORY")
    destination = Path(sys.argv[1]).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    environment = {**os.environ, "SOURCE_DATE_EPOCH": str(EPOCH)}
    subprocess.run([sys.executable, "-m", "build", "--outdir", str(destination)], check=True, env=environment)
    sdists = list(destination.glob("*.tar.gz"))
    if len(sdists) != 1:
        raise RuntimeError("expected_exactly_one_sdist")
    normalise_sdist(sdists[0])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
