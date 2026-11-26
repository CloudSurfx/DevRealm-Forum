# RASP Tuning Guide

This guide walks through the process of tuning RASP policies to minimize false positives while maintaining strong protection.

## Tuning Phases

### Phase 1: Deploy in Monitor Mode (Week 1-2)

```yaml
# openrasp-java.yaml
global_action: "log"  # Only log, don't block
```

**Goals:**
- Collect baseline of normal application behavior
- Identify false positives without impacting users
- Build attack profile for your specific application

**Actions:**
1. Deploy RASP agent with `global_action: "log"`
2. Run normal production traffic for 1-2 weeks
3. Run daily audit: `python rasp_audit.py --config detection-plugins.json --attack-log /var/log/rasp/attacks.jsonl`
4. Review findings tagged as `monitor_only` or false positives

### Phase 2: Analyze and Adjust (Week 2-3)

**Common False Positive Sources:**

| Plugin | Common False Positives | Mitigation |
|--------|------------------------|------------|
| SQLi | Complex search queries, ORM generated SQL | Add to whitelist, adjust algorithm to "loose" |
| Command Injection | Legitimate shell commands (ping, curl) | Whitelist specific commands/parameters |
| SSRF | Legitimate internal API calls | Add allowed_domains/allowed_ips |
| Path Traversal | Legitimate file operations | Add allowed_paths |
| XSS | Rich text editors, user-generated content | Keep in "log" mode, use CSP headers instead |
| Deserialization | Legitimate object serialization | Whitelist safe classes |

**Configuration Adjustments:**

```yaml
# Example: Reduce SQLi sensitivity for search endpoints
plugin:
  sql_injection:
    algorithm: "loose"  # Instead of "default" or "strict"
    config:
      whitelist:
        - "search_query_pattern_*"
```

### Phase 3: Selective Blocking (Week 3-4)

Switch high-confidence plugins to block mode:

```yaml
# High confidence - low false positive plugins
plugin:
  sql_injection:
    action: "block"
  command_injection:
    action: "block"
  ssrf:
    action: "block"
  path_traversal:
    action: "block"
  xxe:
    action: "block"
  deserialization:
    action: "block"
  rce:
    action: "block"
  file_upload:
    action: "block"
  ldap_injection:
    action: "block"

# Keep in monitor mode - higher false positive risk
plugin:
  xss:
    action: "log"
  reflection:
    action: "log"
```

### Phase 4: Global Block Mode (Week 4+)

```yaml
global_action: "block"
```

## Whitelisting Strategies

### 1. Parameter-Level Whitelisting

```yaml
# For specific endpoints with known safe patterns
plugin:
  sql_injection:
    config:
      whitelist:
        - param: "search_q"
          pattern: "^[a-zA-Z0-9\\s\\-_.]{1,100}$"
        - param: "filter"
          pattern: "^(active|inactive|pending)$"
```

### 2. Endpoint-Level Whitelisting

```yaml
# Disable specific plugins for certain endpoints
endpoint_exclusions:
  - path: "/api/public/search"
    plugins: ["xss", "sql_injection"]
  - path: "/api/admin/reports"
    plugins: ["sql_injection"]  # Complex reporting queries
```

### 3. IP/Source-Based Whitelisting (Use Sparingly)

```yaml
# Only for trusted internal sources
trusted_sources:
  - ip: "10.0.0.0/8"
    reason: "Internal monitoring"
  - ip: "192.168.1.100"
    reason: "CI/CD pipeline"
```

## Algorithm Selection

| Algorithm | Sensitivity | False Positives | Use Case |
|-----------|-------------|-----------------|----------|
| `strict` | Highest | Highest | High-security endpoints (admin, payment) |
| `default` | Balanced | Medium | General purpose |
| `loose` | Lowest | Lowest | Search, reporting, user content |

## Performance Tuning

### CPU Limit
```yaml
performance:
  cpu_limit_percent: 5  # Max 5% CPU overhead
  memory_limit_mb: 128  # Max 128MB memory
```

### Sampling (High Traffic)
```yaml
performance:
  sampling_rate: 0.1  # Sample 10% of requests
```

**Warning:** Sampling reduces protection coverage. Only use for extremely high-traffic applications (>10k RPS) where full inspection causes latency issues.

## Monitoring and Alerting

### Key Metrics to Watch

1. **Block Rate** - Should stabilize at 0.1-1% of total requests
2. **False Positive Rate** - Target < 0.01% of blocked requests
3. **Latency Overhead** - Target < 5ms p99
4. **CPU/Memory Usage** - Stay within configured limits

### Alert Rules

```yaml
# Example Prometheus alerts
alerts:
  - name: RASPHighBlockRate
    expr: rate(rasp_blocked_total[5m]) > 10
    severity: warning
    annotations:
      summary: "High RASP block rate detected"

  - name: RASPFalsePositiveSpike
    expr: rate(rasp_false_positive_total[1h]) > 0.001
    severity: critical
    annotations:
      summary: "Possible false positive spike - review rules"

  - name: RASPPerformanceDegradation
    expr: histogram_quantile(0.99, rasp_latency_seconds_bucket) > 0.05
    severity: warning
    annotations:
      summary: "RASP adding >50ms latency"
```

## Attack Log Analysis

### Daily Review Checklist

```bash
# Run audit
python rasp_audit.py --config detection-plugins.json --attack-log /var/log/rasp/attacks.jsonl --output daily-report.json

# Check for:
# 1. New attack types not previously seen
# 2. Repeated attacks from same IP (potential targeted attack)
# 3. Blocked requests that might be legitimate (false positives)
# 4. Attack patterns matching known CVEs
```

### Weekly Tuning Review

1. Export audit reports for the week
2. Identify top 5 false positive patterns
3. Add whitelist entries or adjust algorithms
4. Verify coverage hasn't decreased
5. Update detection rules if new CVEs published

## Rollback Procedure

If blocking causes issues:

1. **Immediate**: Switch to monitor mode
   ```bash
   # Hot reload (if supported) or restart with:
   global_action: "log"
   ```

2. **Short-term**: Disable specific plugin
   ```yaml
   plugin:
     problematic_plugin:
       enabled: false
   ```

3. **Investigate**: Analyze blocked requests in logs
4. **Fix**: Adjust whitelist/algorithm
5. **Re-enable**: Test in staging, then production

## Compliance Mapping

| Regulation | RASP Requirement | Configuration |
|------------|------------------|---------------|
| PCI DSS 6.5.6 | SQL injection protection | `sql_injection: block` |
| PCI DSS 6.5.8 | Command injection protection | `command_injection: block` |
| OWASP ASVS 5.3.4 | Path traversal protection | `path_traversal: block` |
| OWASP ASVS 12.2.1 | SSRF protection | `ssrf: block` |
| ISO 27001 A.14.2.5 | Secure system engineering | All plugins enabled |

## Maintenance Schedule

| Frequency | Task |
|-----------|------|
| Daily | Run audit script, review alerts |
| Weekly | Review false positives, update whitelists |
| Monthly | Update OpenRASP agent, review CVE coverage |
| Quarterly | Full policy review, penetration test validation |
| Annually | Architecture review, threat model update |

## Troubleshooting

### Agent Not Loading
```bash
# Check Java agent attachment
ps aux | grep javaagent
curl http://localhost:8081/rasp/status
```

### High Latency
```bash
# Check RASP stats
curl http://localhost:8081/rasp/stats
# Look for: plugin_timeouts, cpu_throttling
```

### Logs Not Forwarding
```bash
# Test syslog
logger -n localhost -P 514 -t openrasp '{"test": "message"}'
# Check Logstash
curl http://localhost:9600/_node/stats/pipelines
```

### False Positive Investigation
```bash
# Find specific blocked request
grep "request_id" /var/log/rasp/attacks.jsonl | jq 'select(.request_id=="req-123")'
# Analyze pattern
python -c "
import re
pattern = r'YOUR_PATTERN'
test = 'BLOCKED_VALUE'
print(re.search(pattern, test))
"
```