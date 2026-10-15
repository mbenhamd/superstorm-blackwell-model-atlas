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
HF_ID = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.-]*/[A-Za-z0-9][A-Za-z0-9_.-]*')

def option_value(args: list[str], names: set[str], default: str | None = None) -> str | None:
    """Read a controlled scalar option, rejecting duplicate aliases and missing values."""
    values = []
    for i, arg in enumerate(args):
        flag, sep, value = arg.partition('=')
        if flag.replace('_', '-') not in names:
            continue
        if not sep:
            if i + 1 == len(args) or args[i + 1].startswith('-'):
                raise ValueError(f'Missing value for {flag}.')
            value = args[i + 1]
        if not value:
            raise ValueError(f'Missing value for {flag}.')
        values.append(value)
    if len(values) > 1:
        raise ValueError(f'Duplicate option or alias: {sorted(names)[0]}.')
    return values[0] if values else default

def validate_profile(p: dict) -> None:
    """Validate the atlas profile contract, including blocked records, without executing."""
    if not isinstance(p, dict):
        raise ValueError('A profile must be a JSON object.')
    if p.get('status') not in ('candidate', 'compatibility-probe', 'blocked'):
        raise ValueError('Unknown profile status.')
    if p.get('engine') not in ('vllm', 'sglang') or not isinstance(p.get('hf_id'), str) or not HF_ID.fullmatch(p['hf_id']):
        raise ValueError('Invalid engine or checkpoint identity.')
    for field in ('gpu_count', 'tensor_parallel_size', 'data_parallel_size', 'context_cap'):
        if type(p.get(field)) is not int or p[field] < 1:
            raise ValueError(f'{field} must be a positive integer.')
    if p['gpu_count'] > 8:
        raise ValueError('This profile must allocate between one and eight GPUs.')
    if p['gpu_count'] != p['tensor_parallel_size'] * p['data_parallel_size']:
        raise ValueError('gpu_count must equal tensor_parallel_size times data_parallel_size.')
    for field in ('requires_reviewed_remote_code', 'requires_image_compatibility_check', 'tested_on_target'):
        if type(p.get(field)) is not bool:
            raise ValueError(f'{field} must be a boolean.')
    for field in ('model_revision', 'draft_revision'):
        if p.get(field) is not None and (not isinstance(p[field], str) or not SHA.fullmatch(p[field])):
            raise ValueError(f'{field} must be null or an immutable 40-character commit.')
    draft_id = p.get('draft_hf_id')
    if draft_id is not None and (not isinstance(draft_id, str) or not HF_ID.fullmatch(draft_id)):
        raise ValueError('Invalid external drafter identity.')
    if p.get('draft_revision') and not draft_id:
        raise ValueError('A draft revision requires an external drafter identity.')
    args = p.get('engine_args')
    if not isinstance(args, list) or not all(isinstance(x, str) and x and '\x00' not in x for x in args):
        raise ValueError('engine_args must be an array of nonempty strings without NUL bytes.')
    forbidden = {'--trust-remote-code', '--no-trust-remote-code', '--model', '--model-path',
                 '--host', '--port', '--revision', '--code-revision', '--tokenizer-revision',
                 '--tokenizer', '--tokenizer-path', '--hf-config-path', '--served-model-name', '--config'}
    if any(arg.split('=', 1)[0].replace('_', '-') in forbidden for arg in args):
        raise ValueError('Identity, bind address and remote-code options are controlled by the launcher.')
    if bool(draft_id) != any('__DRAFT_DIR__' in arg for arg in args):
        raise ValueError('An external drafter needs both draft_hf_id and a __DRAFT_DIR__ argument.')
    tp_names = {'--tensor-parallel-size', '-tp'} if p['engine'] == 'vllm' else {'--tensor-parallel-size', '--tp-size', '--tp'}
    dp_names = {'--data-parallel-size', '-dp'} if p['engine'] == 'vllm' else {'--data-parallel-size', '--dp-size', '--dp'}
    cap_names = {'--max-model-len'} if p['engine'] == 'vllm' else {'--context-length'}
    for field, names, default in (('tensor_parallel_size', tp_names, '1'),
                                  ('data_parallel_size', dp_names, '1'),
                                  ('context_cap', cap_names, None)):
        value = option_value(args, names, default)
        if value is None or not re.fullmatch(r'[1-9][0-9]*', value) or int(value) != p[field]:
            raise ValueError(f'{field} differs from the effective engine argument.')
    for names in ({'--pipeline-parallel-size', '--pp-size', '--pp', '-pp'}, {'--nnodes'}):
        if option_value(args, names, '1') != '1':
            raise ValueError('These profiles support one node and no pipeline parallelism.')
    # The vLLM recipe can enable fake acceptance through JSON or dotted CLI options.
    for i, arg in enumerate(args):
        if synthetic_acceptance_setting(arg):
            raise ValueError('Synthetic or simulated acceptance is forbidden in measurement profiles.')
        flag = arg.split('=', 1)[0].replace('_', '-')
        if flag == '--speculative-config':
            config = json.loads(option_value(args, {'--speculative-config'}))
            if not isinstance(config, dict):
                raise ValueError('speculative-config must be a JSON object.')
            if synthetic_acceptance_setting(json.dumps(config)):
                raise ValueError('Synthetic or simulated acceptance is forbidden in measurement profiles.')
        if flag == '--speculative-config.rejection-sample-method':
            value = arg.split('=', 1)[1] if '=' in arg else (args[i + 1] if i + 1 < len(args) else '')
            if value.lower() == 'synthetic':
                raise ValueError('Synthetic acceptance is forbidden in measurement profiles.')

def check_profile(p: dict, *, allow_probe: bool = False) -> None:
    validate_profile(p)
    if p['status'] == 'blocked':
        raise ValueError('Blocked profile: ' + str(p.get('reason', 'unresolved compatibility')))
    if p['status'] == 'compatibility-probe' and not allow_probe:
        raise ValueError('Use --allow-compatibility-probe only after reviewing the unresolved gates.')

def synthetic_acceptance_setting(value: str) -> bool:
    upper = value.upper()
    return (('SIMULAT' in upper or 'SYNTHETIC' in upper) and
            ('ACC' in upper or 'REJECTION' in upper))

def check_environment(env: dict[str, str]) -> None:
    if any(synthetic_acceptance_setting(name) for name in env):
        raise ValueError('Synthetic or simulated acceptance is forbidden in these measurement profiles.')

def verify_local(path: Path, hf_id: str, expected_revision: str | None = None) -> dict:
    if (path / 'INCOMPLETE.txt').exists():
        raise ValueError('The metadata snapshot is marked incomplete.')
    if not (path / 'config.json').is_file():
        raise ValueError(f'No config.json in {path}')
    provenance = json.loads((path / 'superstorm-revision.json').read_text(encoding='utf-8'))
    if not isinstance(provenance, dict):
        raise ValueError('Local provenance must be a JSON object.')
    sha = provenance.get('revision', '')
    if not isinstance(sha, str) or not SHA.fullmatch(sha) or provenance.get('hf_id') != hf_id:
        raise ValueError('Local provenance does not match the immutable checkpoint identity.')
    if expected_revision and sha != expected_revision:
        raise ValueError('The selected revision differs from the profile pin.')
    files = provenance.get('files')
    config = files.get('config.json') if isinstance(files, dict) else None
    digest = config.get('sha256') if isinstance(config, dict) else None
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
