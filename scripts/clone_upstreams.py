#!/usr/bin/env python3
"""Print pinned retrieval commands; --execute materializes new checkouts only."""
from __future__ import annotations
import argparse
import datetime as dt
import json
from pathlib import Path
import shlex
import shutil
import subprocess

UPSTREAMS = {
 'vllm': ('https://github.com/vllm-project/vllm.git', 'f8460ef23659afd69046a81529ec2295e4c3f686'),
 'sglang': ('https://github.com/sgl-project/sglang.git', '877be2974aa151a984e52822c028276c2b1e9303'),
}

def commands(name: str, target: Path) -> list[list[str]]:
    url, sha = UPSTREAMS[name]
    return [['git','init',str(target)], ['git','-C',str(target),'remote','add','origin',url],
            ['git','-C',str(target),'fetch','--depth=1','origin',sha],
            ['git','-C',str(target),'checkout','--detach',sha]]

def main() -> None:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--output',type=Path,default=Path('upstreams'))
    ap.add_argument('--only',choices=UPSTREAMS); ap.add_argument('--execute',action='store_true')
    a=ap.parse_args(); names=[a.only] if a.only else list(UPSTREAMS)
    if not a.execute:
        for name in names:
            for cmd in commands(name,a.output/name): print(shlex.join(cmd))
        print('# DRY RUN. No directories, downloads or installs performed. Histories are shallow; submodules are not automatically fetched.')
        return
    if not shutil.which('git'): ap.error('git is not installed.')
    a.output.mkdir(parents=True,exist_ok=True)
    # Never reset, clean, stash or replace an existing checkout.
    for name in names:
        destination=a.output/name
        if destination.exists() or destination.is_symlink(): ap.error(f'Refusing existing destination: {destination}')
    for name in names:
        # mkdir atomically claims this path; rename could replace a concurrently
        # created empty directory. Keep any incomplete new checkout for inspection.
        staging=a.output/name
        try: staging.mkdir()
        except OSError as exc: ap.error(f'Cannot reserve new destination {staging}: {exc}')
        try:
            for cmd in commands(name,staging): subprocess.run(cmd,check=True,timeout=300)
            sha=subprocess.check_output(['git','-C',str(staging),'rev-parse','HEAD'],text=True,timeout=30).strip()
            if sha!=UPSTREAMS[name][1]: raise ValueError('Resolved commit differs from the audit pin.')
            (staging/'superstorm-checkout.json').write_text(json.dumps({'upstream':UPSTREAMS[name][0],
                'commit':sha,'retrieved_at_utc':dt.datetime.now(dt.timezone.utc).isoformat(),
                'history':'shallow','submodules_fetched':False},indent=2)+'\n')
            print(f'Created {staging} at {sha}')
        except (OSError,ValueError,subprocess.SubprocessError) as exc:
            print(f'Retrieval failed. Incomplete new checkout retained at {staging} for inspection.')
            ap.error(str(exc))

if __name__=='__main__': main()
