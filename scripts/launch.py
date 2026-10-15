#!/usr/bin/env python3
"""Dry-run-first launch wrapper. Profiles and local model code must be trusted."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys

SHA = re.compile(r'[0-9a-f]{40}')

def check_profile(p: dict, *, allow_probe: bool = False) -> None:
    if p.get('status') == 'blocked':
        raise ValueError('Blocked profile: ' + p.get('reason', 'unresolved compatibility'))
    if p.get('status') not in ('candidate', 'compatibility-probe'):
        raise ValueError('Unknown profile status.')
    if p['status'] == 'compatibility-probe' and not allow_probe:
        raise ValueError('Use --allow-compatibility-probe only after reviewing the unresolved gates.')
    if p.get('engine') not in ('vllm', 'sglang') or not p.get('hf_id'):
        raise ValueError('Invalid engine or checkpoint identity.')
    if not 1 <= p['gpu_count'] <= 8:
        raise ValueError('This profile must allocate between one and eight GPUs.')
    if not isinstance(p.get('engine_args'), list) or not all(isinstance(x, str) for x in p['engine_args']):
        raise ValueError('engine_args must be an array of strings.')
    forbidden = {'--trust-remote-code', '--model', '--model-path', '--host', '--port', '--revision', '--code-revision', '--tokenizer-revision'}
    if any(arg.split('=', 1)[0] in forbidden for arg in p['engine_args']):
        raise ValueError('Identity, bind address and remote-code options are controlled by the launcher.')

def check_environment(env: dict[str, str]) -> None:
    if any('SIMULAT' in name.upper() and 'ACC' in name.upper() for name in env):
        raise ValueError('Simulated acceptance is forbidden in these measurement profiles.')

def verify_local(path: Path, hf_id: str, expected_revision: str | None = None) -> dict:
    if not (path / 'config.json').is_file():
        raise ValueError(f'No config.json in {path}')
    provenance = json.loads((path / 'superstorm-revision.json').read_text(encoding='utf-8'))
    sha = provenance.get('revision', '')
    if not SHA.fullmatch(sha) or provenance.get('hf_id') != hf_id:
        raise ValueError('Local provenance does not match the immutable checkpoint identity.')
    if expected_revision and sha != expected_revision:
        raise ValueError('The selected revision differs from the profile pin.')
    digest = provenance.get('files', {}).get('config.json', {}).get('sha256')
    if digest != hashlib.sha256((path / 'config.json').read_bytes()).hexdigest():
        raise ValueError('config.json differs from its metadata provenance hash.')
    return provenance

def build_command(p: dict, model: str, *, draft: str | None = None,
                  host: str = '127.0.0.1', port: int = 8000,
                  allow_remote: bool = False, python: str = sys.executable) -> list[str]:
    if not 1 <= port <= 65535: raise ValueError('Invalid port.')
    args = []
    for x in p['engine_args']:
        if '__DRAFT_DIR__' in x:
            if not draft: raise ValueError('An external drafter directory is required.')
            x = x.replace('__DRAFT_DIR__', draft)
        args.append(x)
    if p['engine'] == 'vllm':
        cmd = ['vllm', 'serve', model, '--served-model-name', p['hf_id']]
    elif p['engine'] == 'sglang':
        cmd = [python, '-m', 'sglang.launch_server', '--model-path', model,
               '--served-model-name', p['hf_id']]
    else: raise ValueError('Unknown engine.')
    cmd += args + ['--host', host, '--port', str(port)]
    if allow_remote: cmd.append('--trust-remote-code')
    return cmd

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--profile', type=Path, required=True)
    ap.add_argument('--model-dir', type=Path); ap.add_argument('--draft-dir', type=Path)
    ap.add_argument('--execute', action='store_true')
    ap.add_argument('--accept-unbenchmarked', action='store_true')
    ap.add_argument('--allow-compatibility-probe', action='store_true')
    ap.add_argument('--allow-reviewed-remote-code', action='store_true')
    ap.add_argument('--host', default='127.0.0.1'); ap.add_argument('--port', type=int, default=8000)
    a = ap.parse_args()
    try:
        p = json.loads(a.profile.read_text(encoding='utf-8'))
        check_profile(p, allow_probe=a.allow_compatibility_probe)
        check_environment(dict(os.environ))
        if a.execute:
            if not a.accept_unbenchmarked or not a.model_dir:
                raise ValueError('Execution needs --accept-unbenchmarked and --model-dir.')
            if p.get('requires_reviewed_remote_code') and not a.allow_reviewed_remote_code:
                raise ValueError('Audit model code, then explicitly use --allow-reviewed-remote-code.')
            verify_local(a.model_dir, p['hf_id'], p.get('model_revision'))
            if p.get('draft_hf_id'):
                if not a.draft_dir: raise ValueError('A pinned --draft-dir is required.')
                verify_local(a.draft_dir, p['draft_hf_id'], p.get('draft_revision'))
        cmd = build_command(p, str(a.model_dir.resolve()) if a.model_dir else '/models/PINNED_REVISION',
                            draft=str(a.draft_dir.resolve()) if a.draft_dir else '/models/PINNED_DRAFTER_REVISION',
                            host=a.host, port=a.port, allow_remote=a.allow_reviewed_remote_code)
        print(shlex.join(cmd), flush=True)
        if not a.execute:
            print('DRY RUN: no engine started. Verify image flags, local weights and metadata before executing.', file=sys.stderr)
            return
        # The wrapper hashes metadata, not all weight shards. Obtain and verify weights
        # independently against the same commit. No shell execution or auto-download.
        env = dict(os.environ, HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1')
        raise SystemExit(subprocess.run(cmd, env=env, check=False).returncode)
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as exc:
        ap.error(str(exc))

if __name__ == '__main__': main()
