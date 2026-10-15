#!/usr/bin/env python3
"""Render a one-node Standard KServe InferenceService; never applies to a cluster."""
from __future__ import annotations
import argparse
import json
from pathlib import Path, PurePosixPath
import re
import sys
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from scripts.launch import build_command, check_profile

DNS_SUBDOMAIN = re.compile(r'[a-z0-9](?:[-a-z0-9]*[a-z0-9])?(?:\.[a-z0-9](?:[-a-z0-9]*[a-z0-9])?)*')
LABEL_PART = re.compile(r'[A-Za-z0-9](?:[-_.A-Za-z0-9]*[A-Za-z0-9])?')

def valid_selector(key: str, value: str) -> bool:
    prefix, sep, part = key.rpartition('/')
    if not sep: part = key
    if sep and (len(prefix) > 253 or not DNS_SUBDOMAIN.fullmatch(prefix)):
        return False
    return (len(part) <= 63 and bool(LABEL_PART.fullmatch(part)) and
            len(value) <= 63 and bool(LABEL_PART.fullmatch(value)))

def render(p: dict, *, image: str, pvc: str, model_subpath: str, name: str,
           cpu: str, host_memory: str, node_selector: str = 'superstorm.ai/gpu-class=B300',
           allow_probe: bool = False, allow_remote: bool = False,
           draft_subpath: str | None = None, shm_size: str = '8Gi') -> dict:
    check_profile(p, allow_probe=allow_probe)
    if not re.fullmatch(r'[^@\s]+@sha256:[0-9a-f]{64}', image) or '://' in image:
        raise ValueError('Supply an immutable registry image @sha256:64-lowercase-hex digest.')
    if not re.fullmatch(r'[a-z0-9](?:[-a-z0-9]*[a-z0-9])?', name) or len(name)>63:
        raise ValueError('Invalid Kubernetes service name.')
    if len(pvc) > 253 or not DNS_SUBDOMAIN.fullmatch(pvc): raise ValueError('Invalid PVC name.')
    if not re.fullmatch(r'[1-9][0-9]*(?:m)?', str(cpu)):
        raise ValueError('CPU must be a positive whole-core or milliCPU quantity.')
    for quantity in (host_memory, shm_size):
        if not re.fullmatch(r'[1-9][0-9]*(?:Mi|Gi|Ti)', quantity):
            raise ValueError('Memory quantities must be positive integer Mi/Gi/Ti values.')
    def local(subpath: str) -> str:
        pp=PurePosixPath(subpath)
        if pp.is_absolute() or '..' in pp.parts or not pp.parts or '\\' in subpath or '\x00' in subpath:
            raise ValueError('Use a nonempty safe relative PVC subpath.')
        return '/models/' + str(pp)
    model=local(model_subpath)
    if p.get('draft_hf_id') and not draft_subpath: raise ValueError('External draft requires --draft-subpath.')
    draft=local(draft_subpath) if draft_subpath else None
    if p.get('requires_reviewed_remote_code') and not allow_remote:
        raise ValueError('This model needs an explicit reviewed remote-code acknowledgement.')
    if '=' not in node_selector: raise ValueError('node-selector must be KEY=VALUE.')
    key, value=node_selector.split('=',1)
    if not valid_selector(key,value): raise ValueError('Invalid node selector label key or value.')
    command=build_command(p,model,draft=draft,host='0.0.0.0',port=8080,allow_remote=allow_remote,python='python')
    resources={'cpu': str(cpu), 'memory': host_memory, 'nvidia.com/gpu': p['gpu_count']}
    return {
      'apiVersion':'serving.kserve.io/v1beta1','kind':'InferenceService',
      'metadata':{'name':name,'annotations':{'serving.kserve.io/deploymentMode':'Standard'}},
      'spec':{'predictor':{'minReplicas':1,'maxReplicas':1,'nodeSelector':{key:value},
        'automountServiceAccountToken':False,
        'containers':[{'name':'kserve-container','image':image,'command':command,
          'ports':[{'containerPort':8080,'name':'http1'}],
          'env':[{'name':'HF_HUB_OFFLINE','value':'1'},{'name':'TRANSFORMERS_OFFLINE','value':'1'}],
          'resources':{'requests':dict(resources),'limits':dict(resources)},
          'volumeMounts':[{'name':'models','mountPath':'/models','readOnly':True},{'name':'shm','mountPath':'/dev/shm'}],
          'startupProbe':{'httpGet':{'path':'/health','port':8080},'periodSeconds':10,'failureThreshold':180},
          'readinessProbe':{'httpGet':{'path':'/health','port':8080},'periodSeconds':10}}],
        'volumes':[{'name':'models','persistentVolumeClaim':{'claimName':pvc,'readOnly':True}},
                   {'name':'shm','emptyDir':{'medium':'Memory','sizeLimit':shm_size}}]}}}

def main() -> None:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--profile',type=Path,required=True)
    for key in ('image','pvc','model-subpath','name','cpu','host-memory'): ap.add_argument('--'+key,required=True)
    ap.add_argument('--node-selector',default='superstorm.ai/gpu-class=B300')
    ap.add_argument('--draft-subpath'); ap.add_argument('--shm-size',default='8Gi')
    ap.add_argument('--allow-compatibility-probe',action='store_true')
    ap.add_argument('--allow-reviewed-remote-code',action='store_true')
    a=ap.parse_args()
    try:
        p=json.loads(a.profile.read_text())
        doc=render(p,image=a.image,pvc=a.pvc,model_subpath=a.model_subpath,name=a.name,cpu=a.cpu,
                   host_memory=a.host_memory,node_selector=a.node_selector,draft_subpath=a.draft_subpath,
                   shm_size=a.shm_size,allow_probe=a.allow_compatibility_probe,allow_remote=a.allow_reviewed_remote_code)
        print(json.dumps(doc,indent=2))
    except (OSError,ValueError,KeyError) as exc: ap.error(str(exc))

if __name__=='__main__': main()
