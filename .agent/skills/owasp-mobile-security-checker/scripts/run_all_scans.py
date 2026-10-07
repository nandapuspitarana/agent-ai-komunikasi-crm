#!/usr/bin/env python3
"""
OWASP Mobile Security Checker - Unified Runner
Executes all 4 automated scanners (M1, M2, M5, M9) and generates a consolidated audit report.

Post-processing on top of the upstream scanners:
  - M1: de-duplicates findings on (file, line) (several regexes match the same line)
  - M2: tags each package as direct / transitive (from pubspec.yaml) and shows names + versions
  - M5: drops URL-scheme validation lines such as `startsWith('http://')` (not HTTP traffic)
  - Baseline: findings listed in `<project>/owasp_ignore.json` are reported as "accepted"
    and excluded from the totals and the exit code.

owasp_ignore.json format:
  [
    {"category": "M1", "file": "lib/firebase_options.dart", "type": "API Key",
     "reason": "FlutterFire client keys are public; restricted in GCP console"}
  ]
  Keys: category (required), file (substring of path, optional), type/issue/package (optional),
  line (optional), reason (required).
"""

import os
import re
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Set

SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']

# Lines that only check/compare a URL scheme, not open a connection.
SCHEME_CHECK_RE = re.compile(r"""(startsWith|endsWith|contains|replaceFirst|replaceAll|==)\s*\(?\s*['"](http|ws)://""")


def load_direct_dependencies(project_path: Path) -> Set[str]:
    pubspec = project_path / 'pubspec.yaml'
    if not pubspec.exists():
        return set()
    try:
        import yaml  # type: ignore
        data = yaml.safe_load(pubspec.read_text(encoding='utf-8')) or {}
        deps = set((data.get('dependencies') or {}).keys())
        deps |= set((data.get('dev_dependencies') or {}).keys())
        return deps
    except Exception:
        return set()


def load_baseline(project_path: Path) -> List[Dict[str, Any]]:
    path = project_path / 'owasp_ignore.json'
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception as e:
        print(f"Warning: could not parse {path}: {e}")
        return []


def _norm(p: str) -> str:
    return str(p).replace('\\', '/').lower()


def matches_baseline(category: str, finding: Dict[str, Any], baseline: List[Dict[str, Any]]):
    for rule in baseline:
        if rule.get('category') != category:
            continue
        if 'file' in rule and _norm(rule['file']) not in _norm(finding.get('file', '')):
            continue
        if 'line' in rule and int(rule['line']) != int(finding.get('line', -1) or -1):
            continue
        ok = True
        for key in ('type', 'issue', 'package'):
            if key in rule and str(rule[key]).lower() != str(finding.get(key, '')).lower():
                ok = False
                break
        if ok:
            return rule
    return None


def post_process(category: str, findings: List[Dict[str, Any]], direct_deps: Set[str]) -> List[Dict[str, Any]]:
    if category == 'M1':
        seen = set()
        out = []
        for f in findings:
            key = (_norm(f.get('file', '')), f.get('line'))
            if key in seen:
                continue
            seen.add(key)
            out.append(f)
        return out

    if category == 'M2':
        for f in findings:
            pkg = f.get('package')
            if pkg:
                f['dependency_kind'] = 'direct' if pkg in direct_deps else 'transitive'
                # Transitive packages are not actionable on their own: they follow their parent.
                if f['dependency_kind'] == 'transitive' and f.get('severity') in ('HIGH', 'CRITICAL') \
                        and 'outdated' in str(f.get('issue', '')).lower():
                    f['severity_original'] = f['severity']
                    f['severity'] = 'LOW'
        return findings

    if category == 'M5':
        return [f for f in findings if not SCHEME_CHECK_RE.search(str(f.get('code', '')))]

    return findings


def run_scanner(script_path: Path, project_root: str, scan_name: str, output_file: str,
                category: str, direct_deps: Set[str], baseline: List[Dict[str, Any]]) -> Dict[str, Any]:
    print(f"\n{'='*70}")
    print(f"[*] Running {scan_name} ({script_path.name})...")
    print(f"{'='*70}")

    cmd = [sys.executable, str(script_path), str(project_root)]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')

    if proc.stdout:
        print(proc.stdout)
    if proc.stderr:
        print(proc.stderr, file=sys.stderr)

    out_path = Path(project_root) / output_file
    findings: List[Dict[str, Any]] = []
    if out_path.exists():
        try:
            with open(out_path, 'r', encoding='utf-8') as f:
                findings = json.load(f).get('findings', [])
        except Exception as e:
            print(f"Warning: Could not read {output_file}: {e}")

    raw_count = len(findings)
    findings = post_process(category, findings, direct_deps)

    active, accepted = [], []
    for f in findings:
        rule = matches_baseline(category, f, baseline)
        if rule:
            f['accepted_reason'] = rule.get('reason', '')
            accepted.append(f)
        else:
            active.append(f)

    severity_counts = {s: 0 for s in SEVERITIES}
    for item in active:
        sev = str(item.get('severity', 'MEDIUM')).upper()
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    return {
        'name': scan_name,
        'script': script_path.name,
        'output_file': output_file,
        'exit_code': proc.returncode,
        'raw_findings': raw_count,
        'total_findings': len(active),
        'accepted_count': len(accepted),
        'severity_counts': severity_counts,
        'findings': active,
        'accepted': accepted,
    }


def describe(category: str, finding: Dict[str, Any]) -> Dict[str, str]:
    """Title / location / evidence for the markdown report."""
    if category == 'M2' and finding.get('package'):
        cur = finding.get('current_version')
        latest = finding.get('latest_version')
        versions = f" ({cur or '?'} → {latest})" if latest else ''
        kind = finding.get('dependency_kind', '')
        title = f"`{finding['package']}`{versions} — {finding.get('issue', '')}"
        return {'title': title, 'location': f"pubspec ({kind})" if kind else 'pubspec', 'evidence': ''}
    issue = finding.get('issue') or finding.get('type') or 'Issue detected'
    return {
        'title': issue,
        'location': f"{finding.get('file', 'N/A')}:{finding.get('line', 0)}",
        'evidence': (finding.get('code') or finding.get('pattern') or '').strip(),
    }


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')  # Windows cp1252 consoles
        except Exception:
            pass

    project_root = sys.argv[1] if len(sys.argv) > 1 else os.getcwd()
    project_path = Path(project_root).resolve()
    scripts_dir = Path(__file__).resolve().parent

    direct_deps = load_direct_dependencies(project_path)
    baseline = load_baseline(project_path)

    print("\n" + "=" * 70)
    print("  OWASP Mobile Top 10 (2024) - Comprehensive Security Audit")
    print(f"  Target:   {project_path}")
    print(f"  Date:     {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Baseline: {len(baseline)} accepted rule(s)")
    print("=" * 70)

    scans = [
        ('M1', 'OWASP M1: Hardcoded Secrets', 'scan_hardcoded_secrets.py', 'owasp_m1_secrets_scan.json'),
        ('M2', 'OWASP M2: Dependency Vulnerabilities', 'check_dependencies.py', 'owasp_m2_dependencies_scan.json'),
        ('M5', 'OWASP M5: Network Security', 'check_network_security.py', 'owasp_m5_network_scan.json'),
        ('M9', 'OWASP M9: Insecure Storage', 'analyze_storage_security.py', 'owasp_m9_storage_scan.json'),
    ]

    results: Dict[str, Any] = {}
    total_findings = 0
    total_accepted = 0
    total_by_severity = {s: 0 for s in SEVERITIES}

    for key, name, script, output in scans:
        script_file = scripts_dir / script
        if not script_file.exists():
            print(f"Error: Scanner script not found: {script_file}")
            continue
        res = run_scanner(script_file, str(project_path), name, output, key, direct_deps, baseline)
        results[key] = res
        total_findings += res['total_findings']
        total_accepted += res['accepted_count']
        for sev, count in res['severity_counts'].items():
            total_by_severity[sev] = total_by_severity.get(sev, 0) + count

    # Console summary
    print(f"\n{'='*78}")
    print("  COMPREHENSIVE AUDIT SUMMARY (after de-dup / false-positive filter / baseline)")
    print(f"{'='*78}")
    header = f"{'Category':<37} | {'Total':<5} | {'CRIT':<4} | {'HIGH':<4} | {'MED':<4} | {'LOW':<4} | {'Accepted':<8}"
    print(header)
    print('-' * len(header))
    for res in results.values():
        sc = res['severity_counts']
        print(f"{res['name']:<37} | {res['total_findings']:<5} | {sc['CRITICAL']:<4} | {sc['HIGH']:<4} | "
              f"{sc['MEDIUM']:<4} | {sc['LOW']:<4} | {res['accepted_count']:<8}")
    print('-' * len(header))
    print(f"{'TOTAL':<37} | {total_findings:<5} | {total_by_severity['CRITICAL']:<4} | {total_by_severity['HIGH']:<4} | "
          f"{total_by_severity['MEDIUM']:<4} | {total_by_severity['LOW']:<4} | {total_accepted:<8}")
    print(f"{'='*78}\n")

    # Markdown report
    md_report_path = project_path / 'owasp_comprehensive_audit_report.md'
    with open(md_report_path, 'w', encoding='utf-8') as f:
        f.write("# OWASP Mobile Top 10 (2024) - Comprehensive Security Audit Report\n\n")
        f.write(f"- **Target Project**: `{project_path}`\n")
        f.write(f"- **Scan Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"- **Open Findings**: **{total_findings}** (CRITICAL: {total_by_severity['CRITICAL']}, "
                f"HIGH: {total_by_severity['HIGH']}, MEDIUM: {total_by_severity['MEDIUM']}, LOW: {total_by_severity['LOW']})\n")
        f.write(f"- **Accepted (baseline `owasp_ignore.json`)**: {total_accepted}\n\n")
        f.write("> Post-processing: M1 de-duplicated per line, M5 URL-scheme checks filtered, "
                "M2 transitive-only 'outdated' items downgraded to LOW.\n\n")

        f.write("## Summary by Category\n\n")
        f.write("| OWASP Category | Raw | Open | Critical | High | Medium | Low | Accepted |\n")
        f.write("| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n")
        for res in results.values():
            sc = res['severity_counts']
            f.write(f"| **{res['name']}** | {res['raw_findings']} | {res['total_findings']} | {sc['CRITICAL']} | "
                    f"{sc['HIGH']} | {sc['MEDIUM']} | {sc['LOW']} | {res['accepted_count']} |\n")
        f.write(f"| **TOTAL** | | **{total_findings}** | **{total_by_severity['CRITICAL']}** | "
                f"**{total_by_severity['HIGH']}** | **{total_by_severity['MEDIUM']}** | "
                f"**{total_by_severity['LOW']}** | **{total_accepted}** |\n\n")

        f.write("## Detailed Findings\n\n")
        order = {s: i for i, s in enumerate(SEVERITIES)}
        for key, res in results.items():
            f.write(f"### {res['name']}\n\n")
            if not res['findings']:
                f.write("No open issues in this category.\n\n")
            for idx, finding in enumerate(sorted(res['findings'], key=lambda x: order.get(x.get('severity', 'MEDIUM'), 9)), 1):
                d = describe(key, finding)
                f.write(f"#### {idx}. [{finding.get('severity', 'MEDIUM')}] {d['title']}\n")
                f.write(f"- **Location**: `{d['location']}`\n")
                if d['evidence']:
                    f.write(f"- **Evidence**: `{d['evidence']}`\n")
                if finding.get('recommendation'):
                    f.write(f"- **Recommendation**: {finding['recommendation']}\n")
                f.write("\n")
            if res['accepted']:
                f.write("<details><summary>Accepted findings</summary>\n\n")
                for finding in res['accepted']:
                    d = describe(key, finding)
                    f.write(f"- `{d['location']}` — {d['title']} — _{finding.get('accepted_reason', '')}_\n")
                f.write("\n</details>\n\n")

        f.write("## Manual Review Guidelines (M3, M4, M6, M7, M8, M10)\n\n")
        f.write("- **M3: Insecure Authentication**: biometric fallback, session timeouts, token refresh.\n")
        f.write("- **M4: Insufficient Input/Output Validation**: deeplinks, webview URLs, input sanitization.\n")
        f.write("- **M6: Inadequate Privacy Controls**: no PII in analytics / crash logs.\n")
        f.write("- **M7: Insufficient Binary Protection**: `--obfuscate --split-debug-info`, root/jailbreak detection.\n")
        f.write("- **M8: Security Misconfiguration**: permissions in AndroidManifest.xml and Info.plist.\n")
        f.write("- **M10: Insufficient Cryptography**: AES-GCM / ChaCha20-Poly1305, no DES/RC4/MD5.\n")

    json_report_path = project_path / 'owasp_comprehensive_audit_report.json'
    with open(json_report_path, 'w', encoding='utf-8') as f:
        json.dump({
            'project_root': str(project_path),
            'timestamp': datetime.now().isoformat(),
            'total_findings': total_findings,
            'accepted_findings': total_accepted,
            'severity_summary': total_by_severity,
            'categories': results,
        }, f, indent=2, ensure_ascii=False)

    print(f"[*] Consolidated Markdown Report saved to: {md_report_path}")
    print(f"[*] Consolidated JSON Report saved to:     {json_report_path}\n")

    sys.exit(1 if total_by_severity['CRITICAL'] + total_by_severity['HIGH'] > 0 else 0)


if __name__ == '__main__':
    main()
