from __future__ import annotations

import argparse
import html
import json
import os
import stat
import sys
from copy import deepcopy
from pathlib import Path

import rfc8785

from . import __version__
from .contracts import CONTRACT_VERSION, SCHEMA_VERSION, validate
from .checker_result import compose_checker_result
from .cycle5_model import Cycle5LocalModel, MODEL_ARTEFACTS
from .deterministic import content_diff, extract_protected_spans, inspect, now_iso, sha256, validate_candidate
from .model_pack import MODEL_BASE_URL, MODEL_DOWNLOAD_BYTES, install_model_pack, prepare_model_pack
from .receipts import verify_receipt
from .report import checker_html

MAX_INPUT = 250_000


def _model_plan():
    return {
        "profile": "int8",
        "download_bytes": MODEL_DOWNLOAD_BYTES,
        "download_label": "34.5 MB",
        "source": MODEL_BASE_URL,
        "allowlisted_files": ["tier3-cycle5-full-e5small-int8-perchannel.onnx", "vocab.txt"],
        "licence": {"base_model": "intfloat/e5-small", "spdx": "MIT"},
        "retention": "Files are stored only in the absolute directory you choose. Checked text is not sent during model installation.",
        "network": "Two allowlisted HTTPS GET requests occur only after both consent flags are supplied. Redirects are refused.",
        "bundled": False,
    }


def _read(path: str) -> str:
    if path == "-": raw = sys.stdin.buffer.read(MAX_INPUT + 1)
    else:
        source=Path(path)
        if source.stat().st_size>MAX_INPUT: raise ValueError("request_too_large")
        with source.open("rb") as stream: raw=stream.read(MAX_INPUT+1)
    if len(raw) > MAX_INPUT:
        raise ValueError("request_too_large")
    return raw.decode("utf-8", errors="strict")


def _render(value, output_format: str) -> str:
    canonical = rfc8785.dumps(value).decode()
    if output_format == "jsonl": return canonical + "\n"
    if output_format == "json": return canonical + "\n"
    if output_format == "html" and value.get("profile") == "full_checker": return checker_html(value)
    if output_format == "html": return '<!doctype html><html lang="en"><meta charset="utf-8"><title>Opace content integrity evidence</title><main><h1>Opace content integrity evidence</h1><pre>' + html.escape(json.dumps(value, ensure_ascii=False, indent=2)) + "</pre></main></html>\n"
    if "methods" in value:
        return "".join(f'{item["id"]}: {item["status"]}\n' + "".join(f'  Limitation: {line}\n' for line in item["limitations"]) for item in value["methods"])
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def _receipt_for(request, result, created_at):
    content = request["source"]["content"]
    receipt = {"schema_version": SCHEMA_VERSION, "contract_version": CONTRACT_VERSION, "product_version": __version__, "receipt_id": "receipt_" + sha256(content)[7:23], "created_at": created_at, "source": {"content_hash": sha256(content), "normalised_hash": result["source"]["normalised_hash"], "content_type": request["source"]["content_type"], "language": request["source"]["language"], "word_count": result["source"]["word_count"]}, "policy": {"id": "cli-offline", "version": "1.0.0", "requested_checks": request["checks"], "allowed_routes": ["local_service"], "retain_content": False}, "methods": result["methods"], "rewrite": None, "approval": {"scope": "none"}, "limitations": result["limitations"], "contains_content": False, "integrity": {"canonicalisation": "RFC8785"}}
    receipt["integrity"]["payload_hash"] = "sha256:" + __import__("hashlib").sha256(rfc8785.dumps(receipt)).hexdigest()
    validate("integrity-receipt.schema.json", receipt)
    return receipt


def _redact(receipt):
    source=receipt.get("source",{});policy=receipt.get("policy",{});approval=receipt.get("approval",{})
    methods=[{"id":item.get("id"),"category":item.get("category"),"provider_or_method":item.get("provider_or_method"),"version":item.get("version"),"status":item.get("status"),**({"availability":item.get("availability")} if item.get("availability") else {}),**({"native_outcome":item.get("native_outcome")} if item.get("native_outcome") else {}),"score":item.get("score"),"score_scale":item.get("score_scale"),"threshold":item.get("threshold"),"segments":[],"evidence":[],"limitations":["Evidence payload omitted during hash-only redaction."],"started_at":item.get("started_at"),"completed_at":item.get("completed_at"),"privacy_route":item.get("privacy_route")} for item in receipt.get("methods",[]) if isinstance(item,dict)]
    rewrite=receipt.get("rewrite")
    if isinstance(rewrite,dict):
        generator=rewrite.get("generator",{});rewrite={"source_hash":rewrite.get("source_hash"),"candidate_hash":rewrite.get("candidate_hash"),"generator":{"route":generator.get("route"),"provider":generator.get("provider"),"model":generator.get("model"),"prompt_template":"[redacted]","parameters":{}},"gates":[{"id":gate.get("id"),"version":gate.get("version"),"status":gate.get("status"),"hard":gate.get("hard"),"summary":"Evidence omitted during hash-only redaction.","failures":[],"limitations":[]} for gate in rewrite.get("gates",[]) if isinstance(gate,dict)],"selected_candidate":rewrite.get("selected_candidate")}
    else: rewrite=None
    value={"schema_version":receipt.get("schema_version"),"contract_version":receipt.get("contract_version"),"product_version":receipt.get("product_version"),"receipt_id":receipt.get("receipt_id"),"created_at":receipt.get("created_at"),"source":{"content_hash":source.get("content_hash"),"normalised_hash":source.get("normalised_hash"),"content_type":source.get("content_type"),"language":source.get("language"),"word_count":source.get("word_count")},"policy":{"id":policy.get("id"),"version":policy.get("version"),"requested_checks":policy.get("requested_checks",[]),"allowed_routes":policy.get("allowed_routes",[]),"retain_content":False},"methods":methods,"rewrite":rewrite,"approval":{"scope":approval.get("scope")},"limitations":["Content and free-form evidence omitted during hash-only redaction."],"contains_content":False,"integrity":{"canonicalisation":"RFC8785"}}
    value["integrity"]["payload_hash"] = "sha256:" + __import__("hashlib").sha256(rfc8785.dumps(value)).hexdigest()
    validate("integrity-receipt.schema.json", value)
    return value


def parser():
    root = argparse.ArgumentParser(prog="opace-ai-checker")
    root.add_argument("--format", choices=("text", "json", "jsonl", "html"), default="text")
    root.add_argument("--no-colour", action="store_true")
    root.add_argument("--quiet", action="store_true")
    root.add_argument("--config")
    root.add_argument("--cache-dir")
    root.add_argument("--offline", action="store_true")
    root.add_argument("--version", action="store_true")
    root.add_argument("--methods", action="store_true")
    commands = root.add_subparsers(dest="command")
    inspect_command = commands.add_parser("inspect");inspect_command.add_argument("path", nargs="?", default="-");inspect_command.add_argument("--model-dir");inspect_command.add_argument("--receipt");inspect_command.add_argument("--checks");inspect_command.add_argument("--locale",default="en-GB");inspect_command.add_argument("--fail-on",choices=("attention","fail","gate"));inspect_command.add_argument("--fail-on-gate",action="store_true")
    protect=commands.add_parser("protect");protect_commands=protect.add_subparsers(dest="protect_action");extract=protect_commands.add_parser("extract");extract.add_argument("path",nargs="?",default="-");extract.add_argument("--output");validate_command=protect_commands.add_parser("validate");validate_command.add_argument("source");validate_command.add_argument("candidate");validate_command.add_argument("--locks",default="auto");validate_command.add_argument("--fail-on",choices=("attention","fail","gate"));validate_command.add_argument("--fail-on-gate",action="store_true")
    compare=commands.add_parser("compare");compare.add_argument("source");compare.add_argument("candidates",nargs="+");compare.add_argument("--locks",default="auto");compare.add_argument("--fail-on",choices=("attention","fail","gate"));compare.add_argument("--fail-on-gate",action="store_true")
    receipt = commands.add_parser("receipt");receipt.add_argument("action", choices=("verify", "redact", "render"));receipt.add_argument("path");receipt.add_argument("--output")
    model = commands.add_parser("model");model_commands=model.add_subparsers(dest="model_action")
    model_commands.add_parser("plan")
    install=model_commands.add_parser("install");install.add_argument("--output",required=True);install.add_argument("--accept-download",action="store_true");install.add_argument("--accept-model-licence",action="store_true");install.add_argument("--timeout",type=float,default=30.0)
    prepare=model_commands.add_parser("prepare");prepare.add_argument("--precision",choices=("int8","fp32"),default="int8");prepare.add_argument("--model-file",required=True);prepare.add_argument("--vocab-file",required=True);prepare.add_argument("--output",required=True);prepare.add_argument("--accept-model-licence",action="store_true")
    verify=model_commands.add_parser("verify");verify.add_argument("--model-dir",required=True)
    model_commands.add_parser("list")
    serve_command = commands.add_parser("serve");serve_command.add_argument("--host", default="127.0.0.1");serve_command.add_argument("--port", type=int, default=8741);serve_command.add_argument("--model-dir")
    commands.add_parser("improve").add_argument("arguments",nargs="*")
    watermark=commands.add_parser("watermark");watermark.add_argument("arguments",nargs="*")
    commands.add_parser("benchmark").add_argument("arguments",nargs="*")
    return root


def _requested_checks(raw):
    if not raw:return ["unicode.invisible","unicode.homoglyph","style.patterns","watermark.anthropic"]
    mapping={"unicode":"unicode.invisible","homoglyph":"unicode.homoglyph","patterns":"style.patterns","protected":None};output=[]
    for name in raw.split(","):
        if name in {"provenance","local-detectors"}:raise RuntimeError("method_not_configured")
        if name not in mapping:raise ValueError("invalid_check")
        if mapping[name] and mapping[name] not in output:output.append(mapping[name])
    return output


def _write_exclusive(path, value):
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,"wb") as output:output.write(value)


def _locks(raw, source):
    if not raw or raw=="auto":return extract_protected_spans(source,sha256(source))
    if raw=="none":raise ValueError("invalid_locks_none_requires_held_confirmation")
    value=json.loads(_read(raw));spans=value if isinstance(value,list) else value.get("protected_spans") if isinstance(value,dict) else None
    if not isinstance(spans,list):raise ValueError("invalid_locks")
    return spans


def _gate_failed(gates):return any(item.get("hard") and item.get("status")!="pass" for item in gates)


def run(argv=None) -> int:
    args = parser().parse_args(argv)
    if args.config or args.cache_dir:raise ValueError("config_and_cache_not_implemented")
    if args.version: print(__version__);return 0
    if args.methods: print("unicode.invisible\nunicode.homoglyph\nstyle.patterns\nwatermark.anthropic (unsupported)");return 0
    def emit(value):
        if not args.quiet or args.format!="text":sys.stdout.write(value)
    if args.command == "serve":
        if args.offline:raise ValueError("offline_flag_conflicts_with_service")
        from .server import serve, take_service_tokens_from_environment
        run_token,admin_token=take_service_tokens_from_environment();serve(args.host,args.port,run_token,admin_token,args.model_dir);return 0
    if args.command in {"improve","watermark","benchmark"}:raise RuntimeError("method_unsupported" if args.command=="watermark" else "method_not_configured")
    if args.command == "model":
        if args.model_action == "plan":
            emit(_render(_model_plan(),args.format));return 0
        if args.model_action == "list":
            value={"recommended":"int8","profiles":{name:{"bytes":item["bytes"],"sha256":item["sha256"],"bundled":False} for name,item in MODEL_ARTEFACTS.items()},"network":"disabled"}
            emit(_render(value,args.format));return 0
        if args.model_action == "install":
            if not args.accept_download or not args.accept_model_licence:
                emit(_render(_model_plan(),args.format))
            output=install_model_pack(args.output,args.accept_download,args.accept_model_licence,args.timeout)
            value={"status":"installed","model_dir":str(output),"precision":"int8","network":"complete","source":MODEL_BASE_URL}
            emit(_render(value,args.format));return 0
        if args.model_action == "prepare":
            output=prepare_model_pack(args.output,args.model_file,args.vocab_file,args.precision,args.accept_model_licence)
            value={"status":"prepared","model_dir":str(output),"precision":args.precision,"network":"disabled"}
            emit(_render(value,args.format));return 0
        if args.model_action == "verify":
            loaded=Cycle5LocalModel.load(args.model_dir)
            value={"status":"verified","model_dir":str(Path(args.model_dir).resolve()),"identity":loaded.manifest["model"]["identity"],"precision":loaded.manifest["model"]["precision"],"sha256":loaded.manifest["model"]["sha256"],"runtime":"onnxruntime==1.29.0","network":"disabled"}
            emit(_render(value,args.format));return 0
        raise ValueError("invalid_model_action")
    if args.command == "inspect":
        content = _read(args.path);created_at = now_iso();fingerprint = sha256(content)
        if args.locale!="en-GB":raise ValueError("invalid_locale")
        request = {"schema_version": SCHEMA_VERSION, "contract_version": CONTRACT_VERSION, "request_id": "req_" + fingerprint[7:23], "created_at": created_at, "source": {"content": content, "content_type": "html" if args.path.endswith(".html") else "markdown" if args.path.endswith(".md") else "plain_text", "language": args.locale}, "checks": _requested_checks(args.checks), "privacy": {"allowed_routes": ["local_service"], "save_receipt": bool(args.receipt), "retain_content": False}}
        validate("analysis-request.schema.json", request)
        if args.model_dir:
            if request["source"]["content_type"] == "html":raise ValueError("cycle5_raw_input_rejects_html")
            result=compose_checker_result(request,Cycle5LocalModel.load(args.model_dir).score(content),created_at)
        else:
            result = inspect(request);validate("analysis-result.schema.json", result)
        if args.receipt:
            if args.model_dir:raise ValueError("checker_receipt_export_not_implemented")
            receipt = _receipt_for(request, result, created_at);path = Path(args.receipt);fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "wb") as output: output.write(rfc8785.dumps(receipt) + b"\n")
            if stat.S_IMODE(path.stat().st_mode) != 0o600: raise ValueError("receipt_permissions_invalid")
        emit(_render(result, args.format));fail_on="gate" if args.fail_on_gate else args.fail_on
        if fail_on in {"attention","fail"} and any(item["status"] in ({"attention","fail","error"} if fail_on=="attention" else {"fail","error"}) for item in result["methods"]):return 4
        return 0
    if args.command=="protect":
        if args.protect_action=="extract":
            content=_read(args.path);value={"schema_version":SCHEMA_VERSION,"contract_version":CONTRACT_VERSION,"protected_spans":extract_protected_spans(content,sha256(content))};output=_render(value,args.format)
            if args.output:_write_exclusive(args.output,output.encode())
            else:emit(output)
            return 0
        if args.protect_action=="validate":
            source,candidate=_read(args.source),_read(args.candidate);gates=validate_candidate(source,candidate,_locks(args.locks,source));emit(_render({"schema_version":SCHEMA_VERSION,"contract_version":CONTRACT_VERSION,"gates":gates},args.format));fail_on="gate" if args.fail_on_gate else args.fail_on;return 4 if fail_on=="gate" and _gate_failed(gates) else 0
        raise ValueError("invalid_protect_action")
    if args.command=="compare":
        if len(args.candidates)>5:raise ValueError("invalid_candidate_count")
        source=_read(args.source);spans=_locks(args.locks,source);candidates=[]
        for path in args.candidates:
            candidate=_read(path);candidates.append({"path":path,"source_hash":sha256(source),"candidate_hash":sha256(candidate),"diff":content_diff(source,candidate),"gates":validate_candidate(source,candidate,spans)})
        emit(_render({"schema_version":SCHEMA_VERSION,"contract_version":CONTRACT_VERSION,"candidates":candidates},args.format));fail_on="gate" if args.fail_on_gate else args.fail_on;return 4 if fail_on=="gate" and any(_gate_failed(item["gates"]) for item in candidates) else 0
    if args.command == "receipt":
        value = json.loads(_read(args.path))
        if args.action == "verify":
            errors = verify_receipt(value);emit(_render({"valid": not errors, "schema_version": SCHEMA_VERSION, "contract_version": CONTRACT_VERSION, "errors": errors}, args.format));return 0 if not errors else 2
        if args.action == "redact":
            value = _redact(value)
            if args.output:
                fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(fd, "wb") as output: output.write(rfc8785.dumps(value) + b"\n")
            else: emit(_render(value, args.format))
            return 0
        errors=verify_receipt(value)
        if errors:raise ValueError("invalid_receipt")
        emit(_render(value, "html"));return 0
    parser().print_help();return 2


def main(argv=None):
    try: code = run(argv)
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError, OSError) as error:
        print(str(error), file=sys.stderr);code = 2
    except KeyboardInterrupt: code = 130
    except RuntimeError as error:
        message=str(error);print(message,file=sys.stderr)
        if "consent_required" in message or "licence_acceptance_required" in message:code=5
        elif "not_configured" in message or "unsupported" in message or message.startswith("model_"):code=3
        else:code=10
    except Exception:
        print("internal_error", file=sys.stderr);code = 10
    raise SystemExit(code)
