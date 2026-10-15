from __future__ import annotations
import copy
import hashlib
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.memory import weight_bytes,gqa_kv_bytes,recurrent_matrix_bytes,state_pool_ratio
from scripts.launch import check_profile,check_environment,build_command,verify_local
from scripts.clone_upstreams import commands,UPSTREAMS
from scripts.fetch_metadata import SecureRedirect,fetch
from scripts.validate_repo import validate
from deploy.kserve.render import render
from benchmarks.run_streaming import semantic,percentile,summarize,probe,prepare_payload,endpoint_url,main as benchmark_main
from urllib.request import Request
from urllib.error import HTTPError

P=json.loads((ROOT/'profiles/qwen3.8-27b.bf16.vllm.baseline.json').read_text())

class ArithmeticTests(unittest.TestCase):
    def test_kimi_fp8_weight_floor(self): self.assertEqual(weight_bytes(2800,'fp8'),2.8e12)
    def test_kimi_exceeds_node(self): self.assertGreater(weight_bytes(2800,'fp8'),8*288e9)
    def test_nvfp4_scale_overhead(self): self.assertEqual(weight_bytes(1,'nvfp4-blocks'),562500000)
    def test_mxfp4_scale_overhead(self): self.assertEqual(weight_bytes(1,'mxfp4-blocks'),531250000)
    def test_mistral_88gib_kv(self): self.assertEqual(gqa_kv_bytes(88,8,128,262144)/2**30,88)
    def test_qwen_16gib_kv(self): self.assertEqual(gqa_kv_bytes(16,4,256,262144)/2**30,16)
    def test_qwen_144mib_matrix(self): self.assertEqual(recurrent_matrix_bytes(48,48,128,128)/2**20,144)
    def test_kimi_414mib_matrix(self): self.assertEqual(recurrent_matrix_bytes(69,96,128,128)/2**20,414)
    def test_invalid_negative(self):
        with self.assertRaises(ValueError): weight_bytes(-1,'fp8')
    def test_invalid_nonfinite(self):
        with self.assertRaises(ValueError): weight_bytes(float('nan'),'bf16')
    def test_state_ratio(self): self.assertEqual(state_pool_ratio(5,2,100,10,10),7)
    def test_invalid_slots(self):
        with self.assertRaises(ValueError): state_pool_ratio(0,0,1,1,1)

class GuardTests(unittest.TestCase):
    def test_candidate(self): check_profile(P)
    def test_blocked(self):
        p=copy.deepcopy(P);p['status']='blocked'
        with self.assertRaises(ValueError): check_profile(p,allow_probe=True)
    def test_probe_requires_opt_in(self):
        p=copy.deepcopy(P);p['status']='compatibility-probe'
        with self.assertRaises(ValueError): check_profile(p)
        check_profile(p,allow_probe=True)
    def test_forbidden_identity(self):
        p=copy.deepcopy(P);p['engine_args']+=['--model-path','untrusted']
        with self.assertRaises(ValueError): check_profile(p)
    def test_identity_aliases_and_config_overrides(self):
        for flag in ('--model_path=other/model','--trust_remote_code','--tokenizer=other/model','--served-model-name=other','--config=other.yaml'):
            with self.subTest(flag=flag):
                p=copy.deepcopy(P);p['engine_args'].append(flag)
                with self.assertRaises(ValueError): check_profile(p)
    def test_profile_scalar_types_and_topology(self):
        for field,value in (('gpu_count',True),('gpu_count','1'),('gpu_count',1.0),
                            ('tensor_parallel_size',2),('data_parallel_size',0),('context_cap',65536),
                            ('requires_reviewed_remote_code','false'),('model_revision','main')):
            with self.subTest(field=field,value=value):
                p=copy.deepcopy(P);p[field]=value
                with self.assertRaises(ValueError): check_profile(p)
        with self.assertRaises(ValueError): check_profile([])
    def test_duplicate_topology_alias_rejected(self):
        p=copy.deepcopy(P);p['engine_args']+=['-tp','2']
        with self.assertRaises(ValueError): check_profile(p)
    def test_missing_context_argument_rejected(self):
        p=copy.deepcopy(P);i=p['engine_args'].index('--max-model-len');del p['engine_args'][i:i+2]
        with self.assertRaises(ValueError): check_profile(p)
    def test_synthetic_acceptance_in_json_and_dotted_arguments(self):
        for args in (['--speculative-config','{"method":"dspark","rejection_sample_method":"synthetic"}'],
                     ['--speculative-config.rejection_sample_method','synthetic'],
                     ['--speculative-config.synthetic_acceptance_length=4.5']):
            with self.subTest(args=args):
                p=copy.deepcopy(P);p['engine_args']+=args
                with self.assertRaises(ValueError): check_profile(p)
    def test_simulated_acceptance(self):
        with self.assertRaises(ValueError): check_environment({'SGLANG_SIMULATE_ACC_LEN':'4.5'})
        with self.assertRaises(ValueError): check_environment({'VLLM_SYNTHETIC_ACCEPTANCE_LENGTH':'4.5'})
    def test_external_drafter_identity_required(self):
        p=copy.deepcopy(P);p['engine_args']+=['--speculative-draft-model-path','__DRAFT_DIR__']
        with self.assertRaises(ValueError): check_profile(p)
        p['draft_hf_id']='organization/draft';check_profile(p)
    def test_local_bind_and_no_trust(self):
        cmd=build_command(P,'/models/pinned')
        self.assertEqual(cmd[:3],['vllm','serve','/models/pinned'])
        self.assertEqual(cmd[cmd.index('--host')+1],'127.0.0.1')
        self.assertNotIn('--trust-remote-code',cmd)
    def test_draft_placeholder_requires_path(self):
        p=copy.deepcopy(P);p['engine_args']+=['--draft-model','__DRAFT_DIR__']
        with self.assertRaises(ValueError): build_command(p,'/models/pinned')
    def test_local_provenance_and_tamper(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td);config=b'{"architectures":["Test"]}'
            (path/'config.json').write_bytes(config)
            meta={'hf_id':P['hf_id'],'revision':'a'*40,'files':{'config.json':{'sha256':hashlib.sha256(config).hexdigest()}}}
            (path/'superstorm-revision.json').write_text(json.dumps(meta))
            self.assertEqual(verify_local(path,P['hf_id'])['revision'],'a'*40)
            with self.assertRaises(ValueError): verify_local(path,'other/model')
            with self.assertRaises(ValueError): verify_local(path,P['hf_id'],'b'*40)
            (path/'INCOMPLETE.txt').write_text('Retrieval failed')
            with self.assertRaises(ValueError): verify_local(path,P['hf_id'])
            (path/'INCOMPLETE.txt').unlink()
            (path/'config.json').write_text('{}')
            with self.assertRaises(ValueError): verify_local(path,P['hf_id'])
    def test_malformed_provenance(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td);(path/'config.json').write_text('{}')
            for meta in ([],{'revision':None}, {'hf_id':P['hf_id'],'revision':'a'*40,'files':[]}):
                (path/'superstorm-revision.json').write_text(json.dumps(meta))
                with self.assertRaises(ValueError): verify_local(path,P['hf_id'])
    def test_clone_pins(self):
        for name,(_,sha) in UPSTREAMS.items():
            cmd=commands(name,Path('/new/checkout'))
            self.assertIn(sha,cmd[2]);self.assertIn('--detach',cmd[3])
            self.assertTrue(all('reset' not in c and 'clean' not in c for c in cmd))
    def test_redirect_strips_auth(self):
        req=Request('https://huggingface.co/x',headers={'Authorization':'Bearer test-not-a-real-token'})
        out=SecureRedirect().redirect_request(req,None,302,'Found',{},'https://cdn.example/x')
        self.assertIsNone(out.get_header('Authorization'))
    def test_redirect_refuses_http(self):
        req=Request('https://huggingface.co/x')
        with self.assertRaises(ValueError): SecureRedirect().redirect_request(req,None,302,'Found',{},'http://cdn.example/x')
    def test_metadata_rejects_invalid_api_shape_before_writes(self):
        with tempfile.TemporaryDirectory() as td:
            for body in (b'[]', b'{"sha":null}', b'{"sha":"main"}'):
                with patch('scripts.fetch_metadata.get',return_value=body):
                    with self.assertRaises(ValueError): fetch('org/model','main',Path(td))
            self.assertFalse(list(Path(td).iterdir()))
    def test_metadata_failure_is_marked_incomplete(self):
        with tempfile.TemporaryDirectory() as td:
            with patch('scripts.fetch_metadata.get',side_effect=[json.dumps({'sha':'a'*40}).encode(),b'[]']):
                with self.assertRaises(ValueError): fetch('org/model','main',Path(td))
            target=Path(td)/'org--model'/('a'*40)
            self.assertTrue((target/'INCOMPLETE.txt').exists())
            self.assertFalse((target/'superstorm-revision.json').exists())
    def test_metadata_receipt_roundtrip_and_optional_missing_file(self):
        sha='a'*40
        def response(url,token):
            if '/api/models/' in url: return json.dumps({'sha':sha}).encode()
            if url.endswith('/config.json'): return b'{"architectures":["Test"]}'
            raise HTTPError(url,404,'Not found',None,None)
        with tempfile.TemporaryDirectory() as td:
            with patch('scripts.fetch_metadata.get',side_effect=response):
                path=fetch('org/model',sha,Path(td))
            receipt=verify_local(path,'org/model',sha)
            self.assertIn('README.md',receipt['missing'])
            self.assertTrue(receipt['metadata_only']);self.assertFalse(receipt['weight_files_verified'])
            with patch('scripts.fetch_metadata.get',side_effect=response):
                with self.assertRaises(FileExistsError): fetch('org/model',sha,Path(td))
    def test_metadata_rejects_immutable_ref_mismatch(self):
        with tempfile.TemporaryDirectory() as td:
            with patch('scripts.fetch_metadata.get',return_value=json.dumps({'sha':'b'*40}).encode()):
                with self.assertRaises(ValueError): fetch('org/model','a'*40,Path(td))
            self.assertFalse(list(Path(td).iterdir()))
    def test_clone_rejects_dangling_destination_without_fetch(self):
        from scripts.clone_upstreams import main
        with tempfile.TemporaryDirectory() as td:
            destination=Path(td)/'vllm';destination.symlink_to(Path(td)/'missing')
            with patch('sys.argv',['clone_upstreams.py','--execute','--only','vllm','--output',td]), \
                 patch('scripts.clone_upstreams.shutil.which',return_value='/usr/bin/git'), \
                 patch('scripts.clone_upstreams.subprocess.run') as run, \
                 patch('sys.stderr',new_callable=io.StringIO):
                with self.assertRaises(SystemExit): main()
            run.assert_not_called();self.assertTrue(destination.is_symlink())

class DeploymentTests(unittest.TestCase):
    def args(self): return dict(image='registry.example/engine@sha256:'+'a'*64,pvc='model-cache',model_subpath='qwen/pin',name='qwen27b',cpu='16',host_memory='128Gi')
    def test_valid_structure(self):
        d=render(P,**self.args());p=d['spec']['predictor'];c=p['containers'][0]
        self.assertEqual(d['metadata']['annotations']['serving.kserve.io/deploymentMode'],'Standard')
        self.assertEqual(c['resources']['limits']['nvidia.com/gpu'],1)
        self.assertTrue(c['volumeMounts'][0]['readOnly'])
        self.assertEqual(c['command'][c['command'].index('--host')+1],'0.0.0.0')
        self.assertEqual(p['maxReplicas'],1)
        self.assertFalse(p['automountServiceAccountToken'])
    def test_mutable_image_rejected(self):
        a=self.args();a['image']='registry.example/engine:latest'
        with self.assertRaises(ValueError): render(P,**a)
    def test_placeholder_digest_rejected(self):
        a=self.args();a['image']='registry.example/engine@sha256:YOUR_64_HEX_DIGEST'
        with self.assertRaises(ValueError): render(P,**a)
    def test_path_traversal_rejected(self):
        a=self.args();a['model_subpath']='../private'
        with self.assertRaises(ValueError): render(P,**a)
    def test_absolute_path_rejected(self):
        a=self.args();a['model_subpath']='/private'
        with self.assertRaises(ValueError): render(P,**a)
    def test_unknown_resources_rejected(self):
        a=self.args();a['cpu']='0'
        with self.assertRaises(ValueError): render(P,**a)
    def test_invalid_pvc_and_node_selector_rejected(self):
        for field,value in (('pvc','cache-'),('pvc','cache..name'),('pvc','x'*254),
                            ('node_selector','bad key=B300'),('node_selector','example.com/=B300'),
                            ('node_selector','example.com/gpu=bad value'),('model_subpath','./')):
            with self.subTest(field=field,value=value):
                a=self.args();a[field]=value
                with self.assertRaises(ValueError): render(P,**a)

class ProbeTests(unittest.TestCase):
    def run_events(self,events):
        class Response(io.BytesIO):
            headers={'Content-Type':'text/event-stream; charset=utf-8'}
        data=b''.join(b'data: '+(e.encode() if isinstance(e,str) else json.dumps(e).encode())+b'\n\n' for e in events)
        with patch.dict('os.environ',{},clear=True), patch('benchmarks.run_streaming.request.build_opener') as opener:
            opener.return_value.open.return_value=Response(data)
            row=probe('http://localhost:8000','test/model',{'messages':[{'role':'user','content':'x'}]})
        return row
    def test_semantic_reasoning(self): self.assertEqual(semantic({'reasoning_content':'x'}),(True,False))
    def test_semantic_answer(self): self.assertEqual(semantic({'content':'x'}),(True,True))
    def test_empty_delta(self): self.assertEqual(semantic({'role':'assistant'}),(False,False))
    def test_tool_metadata_is_not_first_semantic_content(self):
        self.assertEqual(semantic({'tool_calls':[{'index':0,'id':'call_1','type':'function'}]}),(False,False))
        self.assertEqual(semantic({'tool_calls':[{'index':0,'function':{'arguments':'{'}}]}),(True,False))
    def test_percentiles(self):
        self.assertEqual(percentile([1,2,3],.5),2)
        self.assertEqual(percentile([1],.99),1)
        self.assertIsNone(percentile([],.5))
    def test_missing_usage_no_fake_tokens(self):
        row={'ok':True,'completion_tokens':None,'latency_seconds':1,'first_semantic_seconds':.2}
        s=summarize([row],1)
        self.assertIsNone(s['output_tokens_per_second'])
        self.assertFalse(s['output_token_accounting_complete'])
    def test_failed_denominator(self):
        a={'ok':True,'completion_tokens':10,'latency_seconds':1,'first_semantic_seconds':.2}
        b=dict(a,ok=False)
        s=summarize([a,b],2)
        self.assertEqual(s['error_rate'],.5)
        self.assertEqual(s['successful_requests_per_second'],.5)
        self.assertIsNone(s['output_tokens_per_second'])
    def test_network_failure_is_recorded(self):
        with patch('benchmarks.run_streaming.request.build_opener',side_effect=OSError('network disabled')):
            r=probe('http://localhost:8000','test/model',{'messages':[{'role':'user','content':'x'}]})
        self.assertFalse(r['ok']);self.assertEqual(r['error_type'],'OSError')
        self.assertIsNone(r['completion_tokens'])
    def test_valid_stream_separates_reasoning_answer_and_usage(self):
        row=self.run_events([
            {'choices':[{'index':0,'delta':{'reasoning_content':'thinking'}}]},
            {'choices':[{'index':0,'delta':{'content':'answer'}}]},
            {'choices':[{'index':0,'delta':{},'finish_reason':'stop'}]},
            {'choices':[],'usage':{'completion_tokens':7}},'[DONE]'])
        self.assertTrue(row['ok']);self.assertEqual(row['completion_tokens'],7)
        self.assertEqual(row['semantic_chunks'],2)
        self.assertLessEqual(row['first_semantic_seconds'],row['first_answer_seconds'])
        self.assertIsNotNone(row['tpot_proxy_seconds'])
    def test_terminal_marker_alone_or_unfinished_choice_is_failure(self):
        for events in (['[DONE]'],[{'choices':[{'index':0,'delta':{'content':'partial'}}]},'[DONE]']):
            with self.subTest(events=events): self.assertFalse(self.run_events(events)['ok'])
    def test_completed_choice_without_usage_does_not_invent_tokens(self):
        row=self.run_events([{'choices':[{'index':0,'delta':{},'finish_reason':'stop'}]},'[DONE]'])
        self.assertTrue(row['ok']);self.assertIsNone(row['completion_tokens']);self.assertIsNone(row['tpot_proxy_seconds'])
    def test_stream_errors_and_multiple_choices_fail(self):
        for events in ([{'error':{}}],[{'choices':[{'index':1,'delta':{},'finish_reason':'stop'}]}],
                       [{'choices':[{'index':0,'delta':{},'finish_reason':'error'}]}],
                       ['{"usage":{"completion_tokens":NaN}}']):
            with self.subTest(events=events): self.assertFalse(self.run_events(events)['ok'])
    def test_oversized_sse_line_is_failure(self):
        with patch('benchmarks.run_streaming.MAX_LINE_BYTES',16):
            self.assertFalse(self.run_events([{'choices':[]}])['ok'])
    def test_overflowing_usage_is_failure_and_result_remains_serializable(self):
        for number in ('1e999', '-1e999'):
            with self.subTest(number=number):
                row=self.run_events([
                    {'choices':[{'index':0,'delta':{'content':'answer'},'finish_reason':'stop'}]},
                    '{"choices":[],"usage":{"completion_tokens":1,"prompt_tokens":'+number+'}}',
                    '[DONE]'])
                self.assertFalse(row['ok'])
                self.assertEqual(row['error_type'],'ValueError')
                self.assertIsNone(row['usage'])
                json.dumps(row,allow_nan=False)
    def test_payload_is_validated_before_network(self):
        for payload in ({'messages':'text'},{'messages':[{}]},{'messages':[{'role':'user'}],'n':2},
                        {'messages':[{'role':'user'}],'temperature':float('nan')}):
            with self.subTest(payload=payload):
                with self.assertRaises(ValueError): prepare_payload('test/model',payload)
    def test_base_url_accepts_origin_or_v1_and_rejects_credentials(self):
        self.assertEqual(endpoint_url('http://localhost:8000'), 'http://localhost:8000/v1/chat/completions')
        self.assertEqual(endpoint_url('https://example.test/service/v1/'), 'https://example.test/service/v1/chat/completions')
        for url in ('https://user:secret@example.test','https://example.test?token=x','http://example.test:bad'):
            with self.assertRaises(ValueError): endpoint_url(url)
        with self.assertRaises(ValueError): endpoint_url('http://example.test',has_api_key=True)
    def test_unwritable_output_prevents_requests(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td);workload=path/'requests.jsonl';output=path/'exists.json'
            workload.write_text('{"messages":[{"role":"user","content":"x"}]}\n');output.write_text('keep')
            with patch('sys.argv',['run_streaming.py','--model','test/model','--requests-jsonl',str(workload),'--output',str(output)]), \
                 patch('benchmarks.run_streaming.probe') as send, patch('sys.stderr',new_callable=io.StringIO):
                with self.assertRaises(SystemExit): benchmark_main()
            send.assert_not_called();self.assertEqual(output.read_text(),'keep')

class RepositoryTests(unittest.TestCase):
    def test_links_json_and_profiles(self):
        result=validate(ROOT)
        self.assertTrue(result['ok'],result['failures'])
    def test_hybrid_layer_counts(self):
        models=json.loads((ROOT/'catalog/models.json').read_text())['models']
        for m in models:
            c=m['config_projection']
            if 'kda_layers' in c:
                attention=c.get('mla_layers',c.get('sparse_mla_layers'))
                self.assertEqual(c['layers'],c['kda_layers']+attention)
    def test_model_copy_divergence_is_reported(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'atlas'
            shutil.copytree(ROOT,root,ignore=shutil.ignore_patterns('.git','__pycache__','metadata','upstreams'))
            model=json.loads((root/'catalog/models.json').read_text())['models'][0]
            path=root/model['path']/'model.json';local=json.loads(path.read_text());local['display_name']='Changed only in local copy'
            path.write_text(json.dumps(local))
            result=validate(root)
            self.assertIn(f'Catalog/model divergence {model["key"]}',result['failures'])
    def test_uncatalogued_profile_and_nonstandard_json_are_reported(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)/'atlas'
            shutil.copytree(ROOT,root,ignore=shutil.ignore_patterns('.git','__pycache__','metadata','upstreams'))
            (root/'profiles/orphan.json').write_text(json.dumps(P))
            (root/'invalid.json').write_text('{"value":NaN}')
            (root/'duplicate.json').write_text('{"value":1,"value":2}')
            result=validate(root)
            self.assertIn('Uncatalogued profile orphan.json',result['failures'])
            self.assertTrue(any('Nonstandard JSON number' in failure for failure in result['failures']))
            self.assertTrue(any('Duplicate JSON key' in failure for failure in result['failures']))
    def test_no_weights_or_fabricated_measurements(self):
        self.assertFalse(list(ROOT.rglob('*.safetensors')))
        self.assertFalse((ROOT/'benchmarks/results').exists())

if __name__=='__main__': unittest.main()
