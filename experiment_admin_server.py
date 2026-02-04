#!/usr/bin/env python3
import json
import os
import time
import random
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "experiments.json")
ADMIN_DIR = os.path.join(os.path.dirname(__file__), "admin")


def _ensure_data_file():
    if not os.path.exists(DATA_PATH):
        os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
        with open(DATA_PATH, "w", encoding="utf-8") as f:
            json.dump({"experiments": []}, f, indent=2)


def _read_data():
    _ensure_data_file()
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_data(data):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _gen_id():
    return f"exp_{int(time.time())}_{random.randint(1000, 9999)}"


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path, content_type):
        if not os.path.exists(path):
            self.send_response(404)
            self.end_headers()
            return
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return None
        body = self.rfile.read(length)
        try:
            return json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            return None

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/":
            return self._send_file(os.path.join(ADMIN_DIR, "index.html"), "text/html; charset=utf-8")
        if path == "/admin.js":
            return self._send_file(os.path.join(ADMIN_DIR, "admin.js"), "application/javascript; charset=utf-8")
        if path == "/admin.css":
            return self._send_file(os.path.join(ADMIN_DIR, "admin.css"), "text/css; charset=utf-8")

        if path == "/api/experiments":
            data = _read_data()
            return self._send_json(200, data)

        if path.startswith("/api/experiments/"):
            exp_id = path.split("/", 3)[-1]
            data = _read_data()
            for exp in data.get("experiments", []):
                if exp.get("id") == exp_id:
                    return self._send_json(200, exp)
            return self._send_json(404, {"error": "not_found"})

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/experiments":
            payload = self._read_body_json()
            if payload is None:
                return self._send_json(400, {"error": "invalid_json"})

            data = _read_data()
            exp = payload
            exp["id"] = _gen_id()
            exp["createdAt"] = int(time.time())
            exp["updatedAt"] = int(time.time())

            data.setdefault("experiments", []).append(exp)
            _write_data(data)
            return self._send_json(201, exp)

        self.send_response(404)
        self.end_headers()

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/experiments/"):
            exp_id = path.split("/", 3)[-1]
            payload = self._read_body_json()
            if payload is None:
                return self._send_json(400, {"error": "invalid_json"})

            data = _read_data()
            for i, exp in enumerate(data.get("experiments", [])):
                if exp.get("id") == exp_id:
                    payload["id"] = exp_id
                    payload["createdAt"] = exp.get("createdAt")
                    payload["updatedAt"] = int(time.time())
                    data["experiments"][i] = payload
                    _write_data(data)
                    return self._send_json(200, payload)
            return self._send_json(404, {"error": "not_found"})

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/experiments/"):
            exp_id = path.split("/", 3)[-1]
            data = _read_data()
            new_list = [e for e in data.get("experiments", []) if e.get("id") != exp_id]
            if len(new_list) == len(data.get("experiments", [])):
                return self._send_json(404, {"error": "not_found"})
            data["experiments"] = new_list
            _write_data(data)
            return self._send_json(200, {"status": "deleted"})

        self.send_response(404)
        self.end_headers()


if __name__ == "__main__":
    port = int(os.environ.get("EXPERIMENT_ADMIN_PORT", "8000"))
    _ensure_data_file()
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Experiment Admin UI running at http://localhost:{port}")
    server.serve_forever()
