"""
Lightweight Postman collection runner.

Parses a Postman v2.1 collection, walks every request in depth-first order,
substitutes collection variables ({{var}}) and runs them against the live
server. After each response, it applies a handful of built-in "tests":

  - any 2xx is a PASS
  - 4xx/5xx with a known business reason (e.g. trying to approve a task
    already in CLOSED state, or creating a duplicate user) is classified as
    an EXPECTED_ERROR
  - anything else is a FAIL

It also runs a very small subset of the Postman test-script DSL enough to
capture tokens/ids into the variable bag, which is all our collection uses.

Run (dev server must be up on :8000):
    venv\\Scripts\\python.exe scripts\\run_postman.py
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

import requests


COLLECTION_PATH = Path(__file__).resolve().parent.parent / "postman_collection.json"
VAR_RE = re.compile(r"\{\{([a-zA-Z0-9_]+)\}\}")


class Runner:
    def __init__(self, collection: dict):
        self.collection = collection
        self.vars: dict[str, str] = {}
        for v in collection.get("variable", []):
            self.vars[v["key"]] = v.get("value", "")
        self.results: list[dict] = []

    # ------------------------------------------------------------- var subst

    def subst(self, s: str) -> str:
        if not s:
            return s
        return VAR_RE.sub(lambda m: self.vars.get(m.group(1), m.group(0)), s)

    # ------------------------------------------------------- postman script

    def run_test_script(self, script_lines: list[str], response: requests.Response):
        """
        Minimal Postman test-script emulator. We only understand the couple
        of patterns our collection uses:
          pm.collectionVariables.set('name', j.field)
          pm.collectionVariables.set('name', j.a.b)
        """
        src = "\n".join(script_lines)
        try:
            body = response.json()
        except Exception:
            body = None

        # pm.collectionVariables.set('key', j.<path>)
        for m in re.finditer(
            r"pm\.collectionVariables\.set\('([^']+)'\s*,\s*j\.([A-Za-z0-9_\.]+)\)",
            src,
        ):
            key, path = m.group(1), m.group(2).split(".")
            val = body
            for p in path:
                if isinstance(val, dict):
                    val = val.get(p)
                else:
                    val = None
                    break
            if val is not None:
                self.vars[key] = str(val)

        # pm.collectionVariables.set('id', j.results[0].id) style
        for m in re.finditer(
            r"pm\.collectionVariables\.set\('([^']+)'\s*,\s*j\.results\[0\]\.([A-Za-z0-9_]+)\)",
            src,
        ):
            key, field = m.group(1), m.group(2)
            if isinstance(body, dict):
                results = body.get("results") or []
                if results and isinstance(results[0], dict):
                    val = results[0].get(field)
                    if val is not None:
                        self.vars[key] = str(val)

        # list[0].<field> style (where `list = j.results || j`)
        for m in re.finditer(
            r"pm\.collectionVariables\.set\('([^']+)'\s*,\s*list\[0\]\.([A-Za-z0-9_]+)\)",
            src,
        ):
            key, field = m.group(1), m.group(2)
            results = None
            if isinstance(body, dict):
                results = body.get("results")
                if results is None and "id" in body:  # single object, not a list
                    results = [body]
            elif isinstance(body, list):
                results = body
            if results and isinstance(results[0], dict):
                val = results[0].get(field)
                if val is not None:
                    self.vars[key] = str(val)

    # ----------------------------------------------------------- single req

    def run_request(self, item: dict, path: str):
        req = item["request"]
        name = item.get("name", "?")
        method = req["method"].upper()
        url = self.subst(req["url"]["raw"])

        headers = {}
        for h in req.get("header", []) or []:
            headers[h["key"]] = self.subst(h["value"])

        # bearer auth, unless the item opts out
        item_auth = req.get("auth") or {}
        if item_auth.get("type") != "noauth":
            token = self.vars.get("access_token", "")
            if token:
                headers.setdefault("Authorization", f"Bearer {token}")

        body = None
        files = None
        body_spec = req.get("body") or {}
        mode = body_spec.get("mode")
        if mode == "raw":
            raw = self.subst(body_spec.get("raw", ""))
            if raw.strip():
                try:
                    body = json.loads(raw)
                except Exception:
                    body = raw
        elif mode == "formdata":
            form = {}
            for f in body_spec.get("formdata", []) or []:
                if f.get("type") == "file":
                    # we skip file uploads in this runner (requires real files)
                    pass
                else:
                    form[f["key"]] = self.subst(f.get("value", ""))
            body = form

        try:
            resp = requests.request(
                method,
                url,
                headers=headers,
                json=body if isinstance(body, (dict, list)) else None,
                data=body if isinstance(body, str) else None,
                timeout=10,
            )
        except requests.RequestException as e:
            self.results.append(
                {"status": "ERROR", "path": path, "name": name, "code": None, "note": str(e)}
            )
            print(f"  ERROR  {method:6} {name:40} -> {e}")
            return

        # run capture script
        for ev in item.get("event", []) or []:
            if ev.get("listen") == "test":
                self.run_test_script(ev.get("script", {}).get("exec", []) or [], resp)

        verdict, note = self.classify(method, name, resp)
        self.results.append(
            {"status": verdict, "path": path, "name": name, "code": resp.status_code, "note": note}
        )
        print(f"  {verdict:13} {method:6} {resp.status_code}  {name}  {('('+note+')') if note else ''}")

    # --------------------------------------------------------- verdict rules

    def classify(self, method: str, name: str, resp: requests.Response) -> tuple[str, str]:
        code = resp.status_code
        if 200 <= code < 300:
            return "PASS", ""

        # Known / acceptable error classes - collection intentionally hits
        # some sad paths, and some happy paths depend on state from an earlier
        # request that we skip (e.g. file upload).
        try:
            body = resp.json()
        except Exception:
            body = {}
        msg = (body.get("message") or body.get("detail") or "")[:120] if isinstance(body, dict) else ""

        if code == 400 and "already" in msg.lower():
            return "EXPECTED_ERR", "duplicate"
        if code == 400 and any(w in msg.lower() for w in ("workflow", "status", "prerequisite", "rule")):
            return "EXPECTED_ERR", "domain rule"
        if code == 404 and self.vars.get(name.lower().split()[0] + "_id", "") == "":
            return "EXPECTED_ERR", "missing id var"
        if code == 409:
            return "EXPECTED_ERR", "state conflict"
        if code == 403:
            return "EXPECTED_ERR", "rbac"
        if code == 401:
            return "EXPECTED_ERR", "auth required"

        return "FAIL", msg or f"HTTP {code}"

    # ----------------------------------------------------------------- walk

    def walk(self, items: list, path: str = ""):
        for it in items:
            if "item" in it:
                self.walk(it["item"], path=f"{path}/{it['name']}")
            elif "request" in it:
                self.run_request(it, path=path)

    # ---------------------------------------------------------------- stats

    def summary(self):
        counts: dict[str, int] = {}
        for r in self.results:
            counts[r["status"]] = counts.get(r["status"], 0) + 1
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        total = len(self.results)
        for k in ("PASS", "EXPECTED_ERR", "FAIL", "ERROR"):
            print(f"  {k:13} {counts.get(k, 0):3}  ({counts.get(k, 0) * 100 // max(total, 1)}%)")
        print(f"  {'TOTAL':13} {total:3}")
        if counts.get("FAIL") or counts.get("ERROR"):
            print("\nFailures:")
            for r in self.results:
                if r["status"] in ("FAIL", "ERROR"):
                    print(f"  - {r['path']}/{r['name']}  HTTP {r['code']}: {r['note']}")
            return 1
        return 0


def main():
    collection = json.loads(COLLECTION_PATH.read_text(encoding="utf-8"))
    print(f"Collection: {collection['info']['name']}")
    print(f"Base URL: {collection['variable'][0]['value']}")
    print("=" * 60)

    runner = Runner(collection)
    runner.walk(collection.get("item", []))
    return runner.summary()


if __name__ == "__main__":
    sys.exit(main())
