#!/usr/bin/env python3
"""Closed-loop HTTP/SSE probe. Chunk counts are not token counts."""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
import datetime as dt
import hashlib
import json
import math
import os
from pathlib import Path
import time
from urllib import request, parse

MAX_RESPONSE_BYTES = 64 * 1024 * 1024
MAX_LINE_BYTES = 1024 * 1024

def reject_constant(value):
    raise ValueError(f'Nonstandard JSON number: {value}')

def finite_json_float(value: str) -> float:
    number = float(value)
    if not math.isfinite(number):
        raise ValueError('JSON number exceeds the finite floating-point range.')
    return number

class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None

def endpoint_url(base_url: str, *, has_api_key: bool = False) -> str:
    parsed = parse.urlsplit(base_url)
    if parsed.username is not None or parsed.password is not None or parsed.query or parsed.fragment:
        raise ValueError('Do not put credentials/query/fragment in base-url.')
    if parsed.scheme not in ('http', 'https') or not parsed.hostname:
        raise ValueError('Expected an HTTP(S) base URL.')
    # Accessing port validates malformed ports before any request is sent.
    parsed.port
    if has_api_key and parsed.scheme != 'https' and parsed.hostname not in ('127.0.0.1', 'localhost', '::1'):
        raise ValueError('API-key requests to nonlocal endpoints require HTTPS.')
    base = base_url.rstrip('/')
    return base + ('/chat/completions' if parsed.path.rstrip('/').endswith('/v1') else '/v1/chat/completions')

def prepare_payload(model: str, payload: dict) -> bytes:
    if not isinstance(payload, dict) or not isinstance(payload.get('messages'), list) or not payload['messages']:
        raise ValueError('Expected a chat request object with a nonempty messages array.')
    if any(not isinstance(message, dict) or not isinstance(message.get('role'), str) for message in payload['messages']):
        raise ValueError('Each chat message must be an object with a role.')
    if type(payload.get('n', 1)) is not int or payload.get('n', 1) != 1:
        raise ValueError('This probe requires n=1; multiple choices need separate timing and accounting.')
    if not isinstance(model, str) or not model.strip():
        raise ValueError('A nonempty served model name is required.')
    body = dict(payload, model=model, stream=True, stream_options={'include_usage': True})
    return json.dumps(body, ensure_ascii=False, allow_nan=False).encode('utf-8')

def semantic(delta: dict) -> tuple[bool,bool]:
    answer=bool(delta.get('content'))
    def function_content(function):
        return isinstance(function,dict) and bool(function.get('name') or function.get('arguments'))
    tools=delta.get('tool_calls')
    tool_content=isinstance(tools,list) and any(
        isinstance(tool,dict) and function_content(tool.get('function')) for tool in tools)
    any_content=answer or bool(delta.get('reasoning_content') or delta.get('reasoning')) or tool_content or function_content(delta.get('function_call'))
    return any_content,answer

def probe(base_url: str, model: str, payload: dict, timeout: int = 300) -> dict:
    encoded=prepare_payload(model,payload)
    headers={'Content-Type':'application/json','Accept':'text/event-stream'}
    token=os.environ.get('BENCH_API_KEY')
    url=endpoint_url(base_url,has_api_key=bool(token))
    if type(timeout) is not int or timeout < 1: raise ValueError('Timeout must be a positive integer.')
    if token: headers['Authorization']='Bearer '+token
    started=time.perf_counter(); first=None; first_answer=None; chunks=0; usage=None; finish_reason=None
    row={'payload_sha256':hashlib.sha256(encoded).hexdigest(),'ok':False,'completion_tokens':None,
         'first_semantic_seconds':None,'first_answer_seconds':None,'semantic_chunks':0}
    try:
        req=request.Request(url,data=encoded,headers=headers)
        with request.build_opener(NoRedirect()).open(req,timeout=timeout) as response:
            if response.headers.get('Content-Type','').split(';',1)[0].strip().lower() != 'text/event-stream':
                raise ValueError('Expected SSE response, not a buffered JSON or HTML page.')
            total=0; seen_choice=False
            while True:
                # Iterating HTTPResponse reads an unbounded line before the old size check.
                raw=response.readline(MAX_LINE_BYTES+1)
                if not raw: break
                elapsed=time.perf_counter()-started
                if elapsed>timeout: raise TimeoutError('Request time budget exceeded between reads.')
                total+=len(raw)
                if len(raw)>MAX_LINE_BYTES or total>MAX_RESPONSE_BYTES: raise ValueError('Response limit exceeded.')
                line=raw.decode('utf-8').strip()
                if not line.startswith('data:'): continue
                data=line[5:].strip()
                if data=='[DONE]': break
                event=json.loads(data,parse_constant=reject_constant,parse_float=finite_json_float)
                if not isinstance(event,dict): raise ValueError('Expected a JSON event object.')
                if 'error' in event: raise ValueError('Endpoint returned a streaming error event.')
                if event.get('usage') is not None:
                    if not isinstance(event['usage'],dict): raise ValueError('Expected a usage object.')
                    usage=event['usage']
                choices=event.get('choices',[])
                if not isinstance(choices,list): raise ValueError('Expected a choices array.')
                for choice in choices:
                    if not isinstance(choice,dict) or type(choice.get('index')) is not int or choice['index']!=0:
                        raise ValueError('Expected only choice index zero for an n=1 request.')
                    if finish_reason is not None: raise ValueError('Choice data continued after completion.')
                    seen_choice=True
                    delta=choice.get('delta',{})
                    if not isinstance(delta,dict): raise ValueError('Expected a delta object.')
                    has_semantic,has_answer=semantic(delta)
                    if has_semantic:
                        chunks+=1
                        if first is None: first=elapsed
                    if has_answer and first_answer is None: first_answer=elapsed
                    reason=choice.get('finish_reason')
                    if reason is not None:
                        if reason not in ('stop','length','tool_calls','content_filter','function_call'):
                            raise ValueError('Unrecognized or unsuccessful finish reason.')
                        finish_reason=reason
            if not seen_choice or finish_reason is None:
                raise ValueError('Stream ended without a completed choice.')
        row['ok']=True
    except Exception as exc:
        # Keep failure class, not potentially sensitive server response or prompts.
        row['error_type']=type(exc).__name__
    row.update(latency_seconds=time.perf_counter()-started,first_semantic_seconds=first,
               first_answer_seconds=first_answer,semantic_chunks=chunks,finish_reason=finish_reason)
    ct=usage.get('completion_tokens') if isinstance(usage,dict) else None
    if isinstance(ct,int) and not isinstance(ct,bool) and ct>=0: row['completion_tokens']=ct
    row['usage']=usage
    ct=row['completion_tokens']
    row['tpot_proxy_seconds']=(row['latency_seconds']-first)/(ct-1) if row['ok'] and first is not None and ct is not None and ct>1 else None
    return row

def percentile(values: list[float], q: float) -> float | None:
    if not values: return None
    ordered=sorted(values); idx=(len(ordered)-1)*q; lo=int(idx); hi=min(lo+1,len(ordered)-1)
    return ordered[lo]*(hi-idx)+ordered[hi]*(idx-lo) if hi!=lo else ordered[lo]

def summarize(rows: list[dict], wall: float) -> dict:
    successful=[r for r in rows if r['ok']]
    times=[r['latency_seconds'] for r in successful]
    ttft=[r['first_semantic_seconds'] for r in successful if r['first_semantic_seconds'] is not None]
    # An incomplete usage series must not masquerade as total token throughput.
    complete=bool(rows) and all(r['ok'] and r['completion_tokens'] is not None for r in rows)
    return {'requests':len(rows),'successful':len(successful),'failed':len(rows)-len(successful),
            'error_rate':(len(rows)-len(successful))/len(rows) if rows else None,
            'successful_requests_per_second':len(successful)/wall if wall>0 else None,
            'output_tokens_per_second':sum(r['completion_tokens'] for r in rows)/wall if complete and wall>0 else None,
            'output_token_accounting_complete':complete,
            'latency_success_only_p50':percentile(times,.5),'latency_success_only_p95':percentile(times,.95),
            'first_semantic_success_only_p95':percentile(ttft,.95),
            'note':'Closed-loop workload. Successful latency percentiles are conditional on success; failures are reported separately. No goodput/SLO or per-token ITL claim.'}

def main() -> None:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--base-url',default='http://127.0.0.1:8000'); ap.add_argument('--model',required=True)
    ap.add_argument('--requests-jsonl',type=Path,required=True)
    ap.add_argument('--concurrency',type=int,default=1); ap.add_argument('--timeout',type=int,default=300)
    ap.add_argument('--output',type=Path,required=True)
    a=ap.parse_args()
    if a.concurrency<1 or a.timeout<1: ap.error('Concurrency and timeout must be positive.')
    try:
        url=endpoint_url(a.base_url,has_api_key=bool(os.environ.get('BENCH_API_KEY')))
        payloads=[json.loads(line) for line in a.requests_jsonl.read_text(encoding='utf-8').splitlines() if line.strip()]
        if not payloads: raise ValueError('Expected nonempty chat request objects.')
        for payload in payloads: prepare_payload(a.model,payload)
        # Reserve the output before sending requests, including dangling-symlink/race cases.
        a.output.parent.mkdir(parents=True,exist_ok=True)
        with a.output.open('x',encoding='utf-8') as f:
            start=time.perf_counter()
            with ThreadPoolExecutor(max_workers=a.concurrency) as pool:
                rows=list(pool.map(lambda p:probe(a.base_url,a.model,p,a.timeout),payloads))
            wall=time.perf_counter()-start
            report={'schema_version':1,'measurement_kind':'closed-loop HTTP/SSE client probe',
                    'created_at_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'model':a.model,'concurrency':a.concurrency,
                    'wall_seconds':wall,'requests':rows,'summary':summarize(rows,wall),
                    'request_path':parse.urlsplit(url).path,'timeout_seconds':a.timeout}
            json.dump(report,f,indent=2,allow_nan=False)
            f.write('\n')
    except (OSError,ValueError) as exc:
        ap.error(str(exc))
    print(json.dumps(report['summary'],indent=2))

if __name__=='__main__': main()
