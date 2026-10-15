#!/usr/bin/env python3
"""Read-only node inventory. No installation, downloads or configuration changes."""
from __future__ import annotations
import argparse
import datetime as dt
import importlib.metadata as md
import json
import platform
import shutil
import subprocess
from pathlib import Path

def capture(argv: list[str], timeout: int = 20) -> dict:
    if not shutil.which(argv[0]):
        return {'command': argv, 'status': 'unavailable'}
    try:
        p = subprocess.run(argv, capture_output=True, text=True, timeout=timeout, check=False)
        return {'command': argv, 'status': 'ok' if p.returncode == 0 else 'error',
                'returncode': p.returncode, 'stdout': p.stdout[:100000], 'stderr': p.stderr[:20000]}
    except (OSError, subprocess.TimeoutExpired) as exc:
        return {'command': argv, 'status': 'error', 'error': type(exc).__name__}

def inventory() -> dict:
    packages = {}
    for name in ('torch', 'vllm', 'sglang', 'flashinfer-python', 'transformers', 'triton'):
        try: packages[name] = md.version(name)
        except md.PackageNotFoundError: packages[name] = None
    commands = [
        ['nvidia-smi', '--query-gpu=name,memory.total,driver_version,compute_cap', '--format=csv,noheader'],
        ['nvidia-smi', 'topo', '-m'], ['nvidia-smi', '-q', '-d', 'POWER,CLOCK,MEMORY'],
        ['nvcc', '--version'], ['numactl', '--hardware'], ['uname', '-a']]
    return {'retrieved_at_utc': dt.datetime.now(dt.timezone.utc).isoformat(),
            'python': platform.python_version(), 'machine': platform.machine(),
            'packages': packages, 'commands': [capture(c) for c in commands],
            'note': 'Missing tools and command errors are recorded, not treated as a verified GPU. Review inventory before sharing; it can identify hardware. No environment-variable dump or token capture.'}

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--output', type=Path); a = ap.parse_args()
    text = json.dumps(inventory(), indent=2) + '\n'
    if a.output:
        a.output.parent.mkdir(parents=True, exist_ok=True)
        with a.output.open('x', encoding='utf-8') as f: f.write(text)
    else: print(text, end='')

if __name__ == '__main__': main()
