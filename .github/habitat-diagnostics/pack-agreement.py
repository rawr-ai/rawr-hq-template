"""Read-only npm archive comparison. Usage: python pack-agreement.py DIR [DIR]."""

import gzip
import hashlib
import json
import re
import sys
import tarfile
from pathlib import Path


ARCHIVE = re.compile(r"(?:habitat-ai-)?(cli|sdk)(?:-[0-9][0-9A-Za-z.+-]*)?\.tgz", re.I)
DISALLOWED_TEXT_BYTES = bytes(i for i in range(32) if i not in (9, 10, 12, 13)) + b"\x7f"
MAX_MEMBER_BYTES = 64 * 1024 * 1024
MAX_MEMBERS = 10000
DIGESTS = (
    "compressed_sha256",
    "tar_sha256",
    "path_names_sha256",
    "modes_sha256",
    "raw_payload_sha256",
    "text_crlf_normalized_payload_sha256",
)


def digest_stream(stream):
    hasher = hashlib.sha256()
    while block := stream.read(1024 * 1024):
        hasher.update(block)
    return hasher.hexdigest()


def bind(hasher, *fields):
    for field in fields:
        hasher.update(len(field).to_bytes(8, "big"))
        hasher.update(field)


def path_bytes(name):
    return name.encode("utf-8", errors="surrogateescape")


def normalized_text(payload):
    if any(byte in payload for byte in DISALLOWED_TEXT_BYTES):
        return payload, False
    try:
        payload.decode("utf-8")
    except UnicodeDecodeError:
        return payload, False
    return payload.replace(b"\r\n", b"\n"), True


def inspect(archive):
    with archive.open("rb") as stream:
        compressed = digest_stream(stream)
    with gzip.open(archive, "rb") as stream:
        tar = digest_stream(stream)

    paths, modes, raw, normalized = (hashlib.sha256() for _ in range(4))
    regular_count = text_count = normalized_count = 0
    with tarfile.open(archive, mode="r:gz", encoding="utf-8") as stream:
        members = sorted(stream.getmembers(), key=lambda item: path_bytes(item.name))
        if len(members) > MAX_MEMBERS:
            raise ValueError("too many members")
        previous = None
        for member in members:
            name = path_bytes(member.name)
            if previous == name:
                raise ValueError("duplicate member")
            previous = name
            bind(paths, name)
            bind(modes, name, member.type, (member.mode & 0o7777).to_bytes(2, "big"))
            if member.isfile():
                if member.size > MAX_MEMBER_BYTES:
                    raise ValueError("oversized member")
                with stream.extractfile(member) as payload_stream:
                    payload = payload_stream.read()
                adjusted, is_text = normalized_text(payload)
                regular_count += 1
                text_count += int(is_text)
                normalized_count += int(adjusted != payload)
            elif member.issym() or member.islnk():
                payload = adjusted = path_bytes(member.linkname)
            else:
                continue
            bind(raw, name, member.type, hashlib.sha256(payload).digest())
            bind(normalized, name, member.type, hashlib.sha256(adjusted).digest())

    return {
        "compressed_sha256": compressed,
        "tar_sha256": tar,
        "path_names_sha256": paths.hexdigest(),
        "modes_sha256": modes.hexdigest(),
        "raw_payload_sha256": raw.hexdigest(),
        "text_crlf_normalized_payload_sha256": normalized.hexdigest(),
        "members": len(members),
        "regular_files": regular_count,
        "utf8_text_files": text_count,
        "crlf_normalized_files": normalized_count,
    }


def inspect_pair(directory):
    archives = {}
    for archive in directory.iterdir():
        if archive.is_file() and (match := ARCHIVE.fullmatch(archive.name)):
            label = match[1].lower()
            if label in archives:
                raise ValueError("duplicate product")
            archives[label] = archive
    if set(archives) != {"cli", "sdk"}:
        raise ValueError("missing labeled CLI/SDK pair")
    return {label: inspect(archives[label]) for label in sorted(archives)}


def main(args):
    if len(args) not in (1, 2):
        print("Usage: python pack-agreement.py DIR [DIR]", file=sys.stderr)
        return 2
    try:
        result = {"schema": 1, "A": inspect_pair(Path(args[0]))}
        if len(args) == 2:
            result["B"] = inspect_pair(Path(args[1]))
            result["equal"] = {
                label: {key: result["A"][label][key] == result["B"][label][key] for key in DIGESTS}
                for label in ("cli", "sdk")
            }
    except (OSError, EOFError, ValueError, tarfile.TarError):
        print("Cannot fingerprint the labeled npm archive pair.", file=sys.stderr)
        return 2
    print(json.dumps(result, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
