import ast
import unittest
from pathlib import Path


ROOT=Path(__file__).resolve().parents[2]/"src"/"opace_integrity"


class NoEgressTests(unittest.TestCase):
    def test_engine_runtime_has_no_remote_transport_or_telemetry(self):
        network_modules={"requests","httpx","aiohttp","boto3","socketio","websockets"}
        for path in ROOT.glob("*.py"):
            tree=ast.parse(path.read_text(encoding="utf-8"),filename=str(path))
            imported=set()
            for node in ast.walk(tree):
                if isinstance(node,ast.Import):imported.update(alias.name.split(".")[0] for alias in node.names)
                elif isinstance(node,ast.ImportFrom) and node.module:imported.add(node.module.split(".")[0])
            self.assertFalse(imported&network_modules,(path.name,imported&network_modules))
            if path.name not in {"client.py","server.py"}:
                self.assertNotIn("urllib",imported,path.name)
                self.assertNotIn("socket",imported,path.name)
        combined="\n".join(path.read_text(encoding="utf-8") for path in ROOT.glob("*.py")).lower()
        for marker in ("telemetry","analytics endpoint","sendbeacon","sentry","segment.io","posthog"):
            self.assertNotIn(marker,combined)


if __name__=="__main__":unittest.main()
