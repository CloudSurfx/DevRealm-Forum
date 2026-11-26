# RASP Implementation for DevRealms

This directory contains Runtime Application Self-Protection (RASP) configurations, audit scripts, and example attack logs for protecting backend applications.

## Structure

```
rasp/
├── config/
│   ├── openrasp-java.yaml       # OpenRASP config for Java (Tomcat/Spring Boot)
│   ├── openrasp-python.yaml     # OpenRASP-inspired config for Python (Flask/Django)
│   └── detection-plugins.json   # Detection plugin definitions
├── logs/
│   └── attack-sample.jsonl      # Sample attack logs for testing
├── scripts/
│   └── rasp_audit.py            # RASP security audit agent
└── reports/
    └── (audit output goes here)
```

## Quick Start

### 1. Java Application (Tomcat/Spring Boot)

```bash
# Download OpenRASP agent
wget https://github.com/baidu/openrasp/releases/download/1.3.6/rasp-1.3.6.jar -O /opt/rasp/rasp.jar

# Configure
cp rasp/config/openrasp-java.yaml /opt/rasp/rasp.yaml

# Attach to JVM
export CATALINA_OPTS="-javaagent:/opt/rasp/rasp.jar"
# Or for Spring Boot:
# java -javaagent:/opt/rasp/rasp.jar -jar app.jar

# Verify agent loaded
curl -s http://localhost:8080/rasp/status
```

### 2. Python Application (Flask/Django)

```bash
# Install RASP middleware (example)
pip install flask-rasp  # hypothetical package

# Configure
cp rasp/config/openrasp-python.yaml /etc/rasp/config.yaml

# Add middleware to your app
# See rasp/config/openrasp-python.yaml for middleware example
```

### 3. Run Security Audit

```bash
# Audit RASP configuration
python rasp/scripts/rasp_audit.py --config rasp/config/detection-plugins.json

# Audit with attack logs
python rasp/scripts/rasp_audit.py --config rasp/config/detection-plugins.json --attack-log rasp/logs/attack-sample.jsonl

# Output report to file
python rasp/scripts/rasp_audit.py --config rasp/config/detection-plugins.json --output rasp/reports/audit-report.json
```

## Detection Coverage (OWASP Top 10 2021)

| Attack Type | OWASP Category | Hook Point | Status |
|-------------|----------------|------------|--------|
| SQL Injection | A03:2021 | sql_query | ✅ |
| Command Injection | A03:2021 | command_exec | ✅ |
| SSRF | A10:2021 | http_request | ✅ |
| Path Traversal | A01:2021 | file_open | ✅ |
| XXE | A05:2021 | xml_parse | ✅ |
| Insecure Deserialization | A08:2021 | deserialize | ✅ |
| XSS (Reflected) | A03:2021 | response_write | ✅ |
| LDAP Injection | A03:2021 | ldap_query | ✅ |
| Remote Code Execution | A03:2021 | code_eval | ✅ |

## SIEM Integration

Configure syslog forwarding in `rasp.yaml`:

```yaml
log:
  syslog:
    enable: true
    url: "udp://siem.example.com:514"
    tag: openrasp
    format: json
```

Supported SIEM platforms:
- Splunk (HTTP Event Collector)
- Elasticsearch/Logstash
- Graylog
- QRadar
- Custom syslog endpoint

## Tuning Process

1. **Deploy in Monitor Mode** - Set `global_action: "log"` initially
2. **Baseline Period** - Run 1-2 weeks of normal traffic
3. **Review False Positives** - Check audit report for `monitor_only` findings
4. **Adjust Thresholds** - Modify plugin sensitivity in `detection-plugins.json`
5. **Switch to Block Mode** - Set `global_action: "block"` after tuning

## Files

- `config/openrasp-java.yaml` - Complete OpenRASP configuration for Java
- `config/openrasp-python.yaml` - Python RASP middleware configuration
- `config/detection-plugins.json` - Detection plugin definitions for audit
- `logs/attack-sample.jsonl` - Sample attack logs (JSON Lines format)
- `scripts/rasp_audit.py` - Security audit agent (from skill)