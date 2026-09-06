"""Validate submitted file types before privileged restoration and bound output collection."""
import json
import os
import stat


def validate_tree(root):
    counts = [0, 0]
    def visit(path, depth=0):
        if depth > 32:
            raise ValueError('artifact directory depth exceeds 32')
        info = os.lstat(path)
        if stat.S_ISDIR(info.st_mode):
            with os.scandir(path) as entries:
                for entry in entries:
                    visit(entry.path, depth + 1)
        elif not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
            raise ValueError("artifact must contain only directories and unlinked regular files: " + path)
        else:
            counts[0] += 1
            counts[1] += info.st_size
            if counts[0] > 2048 or counts[1] > 64 * 1024 * 1024:
                raise ValueError('artifact exceeds 2048 files or 64 MiB')
    if not stat.S_ISDIR(os.lstat(root).st_mode):
        raise ValueError("artifact root is not a real directory")
    visit(root)


def read_json_artifact(path, limit=8 * 1024 * 1024):
    """Never follow a submitted link or wait indefinitely on a special file."""
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd, "rb") as stream:
        info = os.fstat(stream.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > limit:
            raise ValueError("result is not a bounded regular file")
        data = stream.read(limit + 1)
        if len(data) > limit:
            raise ValueError("result exceeds collection bound")
        return json.loads(data)


if __name__ == "__main__":
    import sys
    validate_tree(sys.argv[1])
