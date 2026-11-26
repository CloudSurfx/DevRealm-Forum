#!/usr/bin/env python3
"""
Flask RASP Middleware Example
Demonstrates how to implement RASP protection in a Flask application.
"""

from flask import Flask, request, jsonify, g
import re
import logging
import json
import time
from functools import wraps
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("flask-rasp")

app = Flask(__name__)

# ===== RASP Configuration =====
RASP_CONFIG = {
    "global_action": "block",  # "log" or "block"
    "plugins": {
        "sql_injection": {
            "enabled": True,
            "action": "block",
            "patterns": [
                r"(?i)\b(union\s+select|insert\s+into|update\s+\w+\s+set|delete\s+from|drop\s+table|alter\s+table)\b",
                r"(?i)('|\"|;|--|/\*|\*/)\s*[=<>]",
                r"(?i)(exec|execute|sp_|xp_)\s*\(",
            ],
        },
        "command_injection": {
            "enabled": True,
            "action": "block",
            "patterns": [
                r"[;&|$`]\s*\w+",
                r"\$\{.*\}",
                r"`.*`",
                r"\|\|",
                r"&&",
            ],
            "dangerous_commands": ["rm", "cat", "ls", "wget", "curl", "nc", "bash", "sh", "powershell", "cmd"],
        },
        "ssrf": {
            "enabled": True,
            "action": "block",
            "blocked_patterns": [
                r"^http://127\.",
                r"^http://localhost",
                r"^http://169\.254\.",
                r"^http://10\.",
                r"^http://172\.(1[6-9]|2[0-9]|3[0-1])\.",
                r"^http://192\.168\.",
            ],
        },
        "path_traversal": {
            "enabled": True,
            "action": "block",
            "patterns": [
                r"\.\./",
                r"\.\.\\",
                r"%2e%2e%2f",
                r"%2e%2e%5c",
                r"\.\.%2f",
                r"\.\.%5c",
            ],
        },
        "xss": {
            "enabled": True,
            "action": "log",  # Usually monitor for reflected XSS
            "patterns": [
                r"(?i)<script[^>]*>.*?</script>",
                r"(?i)on\w+\s*=",
                r"(?i)javascript:",
                r"(?i)data:text/html",
                r"(?i)vbscript:",
                r"(?i)expression\s*\(",
            ],
        },
        "ldap_injection": {
            "enabled": True,
            "action": "block",
            "patterns": [
                r"[*()&|=!]",
                r"\\2a|\\28|\\29|\\26|\\7c|\\3d|\\21",
            ],
        },
        "rce": {
            "enabled": True,
            "action": "block",
            "patterns": [
                r"(?i)\b(eval|exec|compile|__import__)\s*\(",
                r"(?i)subprocess\.(run|Popen|call|check_output)",
                r"(?i)os\.(system|popen|spawn|exec)",
            ],
        },
    },
}

# ===== RASP Detection Engine =====
class RASPDetector:
    def __init__(self, config):
        self.config = config
        self.compiled_patterns = {}
        self._compile_patterns()

    def _compile_patterns(self):
        for plugin_name, plugin_config in self.config["plugins"].items():
            if not plugin_config.get("enabled", False):
                continue
            patterns = plugin_config.get("patterns", [])
            self.compiled_patterns[plugin_name] = [
                re.compile(p) for p in patterns
            ]

    def check_value(self, value, context=""):
        """Check a single value against all enabled plugins."""
        if not isinstance(value, str):
            return None

        for plugin_name, patterns in self.compiled_patterns.items():
            plugin_config = self.config["plugins"][plugin_name]
            for pattern in patterns:
                if pattern.search(value):
                    return {
                        "plugin": plugin_name,
                        "action": plugin_config["action"],
                        "matched_pattern": pattern.pattern,
                        "context": context,
                        "value": value[:200],  # Truncate for logging
                    }
        return None

    def check_request(self):
        """Check all request inputs."""
        findings = []

        # Check query parameters
        for key, value in request.args.items():
            result = self.check_value(str(value), f"query_param:{key}")
            if result:
                findings.append(result)

        # Check form data
        if request.form:
            for key, value in request.form.items():
                result = self.check_value(str(value), f"form_data:{key}")
                if result:
                    findings.append(result)

        # Check JSON body
        if request.is_json:
            try:
                json_data = request.get_json()
                if json_data:
                    self._check_json(json_data, "json_body", findings)
            except Exception:
                pass

        # Check headers (for SSRF, etc.)
        for key, value in request.headers.items():
            if key.lower() in ["user-agent", "referer", "x-forwarded-for", "x-forwarded-host"]:
                result = self.check_value(str(value), f"header:{key}")
                if result:
                    findings.append(result)

        return findings

    def _check_json(self, obj, prefix, findings):
        """Recursively check JSON object."""
        if isinstance(obj, dict):
            for key, value in obj.items():
                self._check_json(value, f"{prefix}:{key}", findings)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                self._check_json(item, f"{prefix}[{i}]", findings)
        elif isinstance(obj, str):
            result = self.check_value(obj, prefix)
            if result:
                findings.append(result)


# ===== RASP Middleware =====
detector = RASPDetector(RASP_CONFIG)

@app.before_request
def rasp_protection():
    """RASP protection middleware - runs before each request."""
    g.rasp_start = time.time()
    g.request_id = f"req-{int(time.time() * 1000)}"

    findings = detector.check_request()

    if findings:
        # Log all findings
        for finding in findings:
            log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": g.request_id,
                "client_ip": request.remote_addr,
                "method": request.method,
                "url": request.url,
                "attack_type": finding["plugin"],
                "action": finding["action"],
                "matched_pattern": finding["matched_pattern"],
                "context": finding["context"],
                "attack_value": finding["value"],
            }
            logger.warning("RASP Detection: %s", json.dumps(log_entry))

        # Block if any finding has action="block" and global_action is "block"
        if RASP_CONFIG["global_action"] == "block":
            block_findings = [f for f in findings if f["action"] == "block"]
            if block_findings:
                return jsonify({
                    "error": "RASP_BLOCKED",
                    "message": "Request blocked by Runtime Application Self-Protection",
                    "request_id": g.request_id,
                    "blocked_attacks": [f["plugin"] for f in block_findings],
                }), 403

    return None


@app.after_request
def rasp_logging(response):
    """Log request timing and response info."""
    if hasattr(g, 'rasp_start'):
        duration = (time.time() - g.rasp_start) * 1000
        logger.info("RASP: %s %s - %ds - %.2fms", request.method, request.path, response.status_code, duration)
    return response


# ===== Example Routes =====
@app.route("/api/users/<int:user_id>")
def get_user(user_id):
    """Example endpoint - would be vulnerable to SQLi without RASP."""
    # Simulate database query
    return jsonify({"id": user_id, "name": f"User {user_id}"})


@app.route("/api/search")
def search():
    """Example endpoint - would be vulnerable to XSS without RASP."""
    query = request.args.get("q", "")
    return jsonify({"query": query, "results": []})


@app.route("/api/ping")
def ping():
    """Example endpoint - would be vulnerable to command injection without RASP."""
    host = request.args.get("host", "8.8.8.8")
    return jsonify({"host": host, "status": "ok"})


@app.route("/api/fetch")
def fetch():
    """Example endpoint - would be vulnerable to SSRF without RASP."""
    url = request.args.get("url", "")
    return jsonify({"url": url, "data": "fetched"})


@app.route("/api/upload", methods=["POST"])
def upload():
    """Example endpoint - would be vulnerable to file upload attacks without RASP."""
    return jsonify({"status": "uploaded"})


@app.route("/rasp/status")
def rasp_status():
    """RASP status endpoint."""
    return jsonify({
        "status": "active",
        "mode": RASP_CONFIG["global_action"],
        "plugins": {name: config["enabled"] for name, config in RASP_CONFIG["plugins"].items()},
    })


@app.route("/rasp/health")
def rasp_health():
    """Health check endpoint."""
    return jsonify({"status": "healthy"})


# ===== Run =====
if __name__ == "__main__":
    print("Starting Flask app with RASP protection...")
    print("RASP Mode:", RASP_CONFIG["global_action"])
    print("Enabled plugins:", [name for name, config in RASP_CONFIG["plugins"].items() if config["enabled"]])
    app.run(host="0.0.0.0", port=5000, debug=False)