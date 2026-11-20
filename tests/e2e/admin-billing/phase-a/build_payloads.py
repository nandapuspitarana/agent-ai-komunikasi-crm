"""Phase A step 7: feed REAL SQL function output (local billing-e2e-pg only) through the proxy's
resolve_period + build_usage_response, and save the JSON payloads the stub proxy will serve.

Run with the proxy's venv:  PYTHONPATH=<proxy repo> .venv/Scripts/python.exe build_payloads.py
"""
import json
import os
import subprocess
import sys
from pathlib import Path

from observability.billing import build_usage_response, resolve_period

OUT = Path(os.environ.get("PAYLOAD_OUT") or (Path(__file__).parent / "payloads"))
OUT.mkdir(exist_ok=True)
CONTAINER = "billing-e2e-pg"  # 127.0.0.1:55440 only
TZ = "Asia/Jakarta"

PERIODS = {
    "this_month": ("2026-11-01", "2026-11-30"),
    "last_month": ("2026-10-01", "2026-10-31"),
    "custom": ("2026-11-10", "2026-11-14"),
    "retention": ("2025-10-01", "2025-10-31"),
    "subcent": ("2026-11-25", "2026-11-25"),
    "long": ("2026-08-01", "2026-11-30"),
}


def psql_scalar(sql: str) -> str:
    out = subprocess.run(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "proxy_e2e", "-tA", "-v", "ON_ERROR_STOP=1"],
        input=sql, capture_output=True, text=True, check=True,
    )
    return out.stdout.strip()


def rpc_json(fn: str, args: list[str]) -> object:
    # Same call the proxy makes through PostgREST (service_role), executed directly.
    lit = ", ".join(f"'{a}'" for a in args)
    raw = psql_scalar(f"SET ROLE service_role; SELECT {fn}({lit});").splitlines()[-1]
    return json.loads(raw)


def main() -> int:
    ok = True
    oldest_raw = psql_scalar("SET ROLE service_role; SELECT to_json(ai_usage_oldest());").splitlines()[-1]
    oldest = json.loads(oldest_raw)  # PostgREST returns the timestamptz scalar as a JSON string
    summary = {}
    for name, (d_from, d_to) in PERIODS.items():
        start, end = resolve_period(d_from, d_to, TZ)
        rows = rpc_json("ai_usage_by_tenant", [start.isoformat(), end.isoformat()])
        daily = rpc_json("ai_usage_daily", [start.isoformat(), end.isoformat(), TZ])
        payload = build_usage_response(rows, daily, oldest, {"from": d_from, "to": d_to, "tz": TZ})
        (OUT / f"{name}.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")

        # Cross-checks: totals == sum(tenants) == direct SQL; by_day sum == totals tokens
        t = payload["totals"]
        sum_tokens = sum(x["total_tokens"] for x in payload["tenants"])
        sum_cost = round(sum(x["cost_usd"] for x in payload["tenants"]), 6)
        sum_req = sum(x["request_count"] for x in payload["tenants"])
        day_tokens = sum(d["total_tokens"] for d in payload["by_day"])
        direct = psql_scalar(
            "SELECT json_build_object('tokens', COALESCE(SUM(COALESCE(input_tokens,0)+COALESCE(output_tokens,0)),0),"
            " 'cost', round(COALESCE(SUM(cost_usd),0),6), 'req', count(*),"
            " 'unpriced', count(*) FILTER (WHERE cost_usd IS NULL AND status='success'),"
            " 'errors', count(*) FILTER (WHERE status='error'))"
            f" FROM ai_trace_logs WHERE created_at >= '{start.isoformat()}' AND created_at < '{end.isoformat()}'"
            " AND request_type IN ('llm_complete','embedding','eval');"
        )
        direct = json.loads(direct)
        checks = {
            "totals.total_tokens == sum(tenants)": t["total_tokens"] == sum_tokens,
            "totals.cost_usd == sum(tenants)": abs(t["cost_usd"] - sum_cost) < 1e-6,
            "totals.request_count == sum(tenants)": t["request_count"] == sum_req,
            "by_day tokens == totals": day_tokens == t["total_tokens"],
            "totals.total_tokens == direct SQL": t["total_tokens"] == int(direct["tokens"]),
            "totals.cost_usd == direct SQL": abs(t["cost_usd"] - float(direct["cost"])) < 1e-6,
            "totals.request_count == direct SQL": t["request_count"] == int(direct["req"]),
            "totals.unpriced_count == direct SQL": t["unpriced_count"] == int(direct["unpriced"]),
            "totals.error_count == direct SQL": t["error_count"] == int(direct["errors"]),
            "tenants sorted by cost desc": [x["cost_usd"] for x in payload["tenants"]]
            == sorted([x["cost_usd"] for x in payload["tenants"]], reverse=True),
        }
        summary[name] = {
            "period": payload["period"],
            "utc_range": [start.isoformat(), end.isoformat()],
            "totals": t,
            "tenants": [(x["tenant_id"], x["total_tokens"], x["cost_usd"], x["unpriced_count"]) for x in payload["tenants"]],
            "by_day_count": len(payload["by_day"]),
            "unpriced_models": payload["unpriced_models"],
            "oldest_available": payload["retention"]["oldest_available"],
            "checks": checks,
        }
        ok &= all(checks.values())
    (OUT / "_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    print("ALL CHECKS PASS" if ok else "SOME CHECKS FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
