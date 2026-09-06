"""Local unit controls; not part of the task's graded pytest collection."""
import json
import os
import tempfile
import unittest
from pathlib import Path

from artifact_guard import read_json_artifact, validate_tree


class ArtifactGuardTests(unittest.TestCase):
    def test_regular_tree_and_json(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "report.json"
            path.write_text(json.dumps({"ok": True}))
            validate_tree(root)
            self.assertEqual(read_json_artifact(path), {"ok": True})

    def test_symlink_is_refused_before_restore_and_read(self):
        with tempfile.TemporaryDirectory() as root:
            target = Path(root) / "protected"
            target.write_text("{}")
            link = Path(root) / "go.mod"
            link.symlink_to(target)
            with self.assertRaises(ValueError):
                validate_tree(root)
            with self.assertRaises(OSError):
                read_json_artifact(link)
            self.assertEqual(target.read_text(), "{}")

    def test_hardlink_is_refused(self):
        with tempfile.TemporaryDirectory() as root:
            target = Path(root) / "first"
            target.write_text("{}")
            os.link(target, Path(root) / "second")
            with self.assertRaises(ValueError):
                validate_tree(root)

    def test_fifo_is_refused_without_blocking(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "pipe"
            os.mkfifo(path)
            with self.assertRaises(ValueError):
                validate_tree(root)
            with self.assertRaises(ValueError):
                read_json_artifact(path)

    def test_oversized_output_is_refused(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "report"
            path.write_text('"' + "x" * 100 + '"')
            with self.assertRaises(ValueError):
                read_json_artifact(path, limit=16)


if __name__ == "__main__":
    unittest.main()
