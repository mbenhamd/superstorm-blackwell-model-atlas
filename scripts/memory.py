#!/usr/bin/env python3
"""Transparent payload arithmetic; never a GPU resident-memory predictor."""
from __future__ import annotations
import argparse
import json
import math

FORMATS = {'bf16': 2.0, 'fp16': 2.0, 'fp8': 1.0, 'fp4-payload': 0.5,
           'mxfp4-blocks': 0.5 + 1 / 32, 'nvfp4-blocks': 0.5 + 1 / 16}

def positive(value: float) -> float:
    if not math.isfinite(value) or value <= 0:
        raise ValueError('All dimensions must be finite and positive.')
    return value

def weight_bytes(parameters_b: float, format_name: str) -> float:
    return positive(parameters_b) * 1e9 * FORMATS[format_name]

def gqa_kv_bytes(layers: int, kv_heads: int, head_dim: int, tokens: int,
                 sequences: int = 1, bytes_per_value: float = 2) -> float:
    """Unpadded ordinary K and V, without sharing/compression/windowing."""
    return 2 * math.prod(positive(x) for x in
                        (layers, kv_heads, head_dim, tokens, sequences, bytes_per_value))

def recurrent_matrix_bytes(layers: int, value_heads: int, key_dim: int,
                           value_dim: int, sequences: int = 1,
                           bytes_per_value: float = 4) -> float:
    """Illustrative direct matrix state; excludes conv, slots and allocator overhead."""
    return math.prod(positive(x) for x in
                     (layers, value_heads, key_dim, value_dim, sequences, bytes_per_value))

def state_pool_ratio(slots: int, draft_slots: int, state_bytes: float,
                     context_tokens: int, kv_bytes_per_token: float) -> float:
    if slots < 1 or draft_slots < 0:
        raise ValueError('slots must be >= 1 and draft_slots >= 0')
    return ((slots + draft_slots) * positive(state_bytes) /
            (positive(context_tokens) * positive(kv_bytes_per_token)))

def units(n: float) -> dict[str, float]:
    return {'bytes': n, 'GB_decimal': n / 1e9, 'GiB_binary': n / 2**30}

def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest='mode', required=True)
    w = sub.add_parser('weights'); w.add_argument('--parameters-b', type=float, required=True)
    w.add_argument('--format', choices=FORMATS, required=True)
    k = sub.add_parser('kv')
    for name in ('layers', 'kv-heads', 'head-dim', 'tokens'):
        k.add_argument('--' + name, type=int, required=True)
    k.add_argument('--sequences', type=int, default=1)
    k.add_argument('--bytes-per-value', type=float, default=2)
    r = sub.add_parser('state')
    for name in ('layers', 'value-heads', 'key-dim', 'value-dim'):
        r.add_argument('--' + name, type=int, required=True)
    r.add_argument('--sequences', type=int, default=1)
    r.add_argument('--bytes-per-value', type=float, default=4)
    a = ap.parse_args()
    try:
        if a.mode == 'weights':
            n = weight_bytes(a.parameters_b, a.format)
            note = 'Uniform idealized format, not a mixed export. Block formats include one block scale; exclude outer scales, padding, higher-precision modules and all runtime memory.'
        elif a.mode == 'kv':
            n = gqa_kv_bytes(a.layers, a.kv_heads, a.head_dim, a.tokens, a.sequences, a.bytes_per_value)
            note = 'Ordinary unpadded K+V only. Invalid as a whole-model formula for MLA, sparse/compressed caches, KV sharing, sliding windows or recurrent state.'
        else:
            n = recurrent_matrix_bytes(a.layers, a.value_heads, a.key_dim, a.value_dim, a.sequences, a.bytes_per_value)
            note = 'Direct recurrent matrix only; no convolution, padding, verification buffers, prefix snapshots or extra slots.'
    except (ValueError, KeyError) as exc:
        ap.error(str(exc))
    print(json.dumps({'kind': a.mode, **units(n), 'assumptions': note}, indent=2))

if __name__ == '__main__': main()
