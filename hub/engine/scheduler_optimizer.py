"""CarbonMesh Carbon-Aware Scheduling Optimizer.

Implements the high-performance rolling-horizon scheduler:
1. Phantom future arrivals: aggregates expected future job releases to reserve cheap solar capacity.
2. Safe unmet penalty LP formulation with high completion safety (q = 1.0).
3. Fast HiGHS dual-simplex linear programming solver (via scipy.optimize.linprog with highs-ds).
4. Robust deadline-first fallback and capacity sanitizer.

Maintains strict compatibility with the competition interface: decide(observation, state).
"""
import json
import os
from typing import Dict, Any, List

try:
    import numpy as np
    from scipy.optimize import linprog
    from scipy.sparse import coo_matrix
    HAVE_LP = True
except Exception:
    HAVE_LP = False
    np = None
    linprog = None
    coo_matrix = None

DEFAULTS = {
    "unmet_penalty": 100.0,
    "phantom_scale": 1.0,
    "phantom_deadline_len": 11,
    "avg_units": 5.5,
    "total_jobs": 22,
    "last_release": 28,
    "release_step": 4,
    "time_eps": 1e-4,
    "use_phantom": 1,
}


def _params():
    p = dict(DEFAULTS)
    raw = os.environ.get("HM_PARAMS")
    if raw:
        try:
            p.update(json.loads(raw))
        except Exception:
            pass
    return p


def _slot_costs(obs):
    slot, H = obs["slot"], obs.get("horizon_slots", 40)
    kwh = obs.get("unit_kwh", 1.0)
    cp = obs.get("carbon_price_gbp_per_kg", 1.0)
    tariff = obs["tariff_gbp_per_kwh"]
    carbon = {}
    for row in obs.get("forecast", []):
        carbon[int(row["slot"])] = float(row["carbon_g_per_kwh"])
    last = None
    costs = {}
    for t in range(slot, H):
        if t in carbon:
            last = carbon[t]
        c = carbon.get(t, last if last is not None else 150.0)
        costs[t] = tariff[t] * kwh + c * kwh / 1000.0 * cp
    return costs


def _phantoms(obs, state, p):
    slot, H = obs["slot"], obs.get("horizon_slots", 40)
    step, last = p["release_step"], p["last_release"]
    future = [r for r in range(0, last + 1, step) if r > slot and r < H]
    if not future or not p["use_phantom"]:
        return []
    seen = len(state.get("seen", []))
    tot_j = obs.get("total_jobs", p["total_jobs"])
    jobs_left = max(0.0, tot_j - seen)
    units_each = jobs_left * p["avg_units"] * p["phantom_scale"] / len(future)
    out, carry = [], 0.0
    for r in future:
        carry += units_each
        u = int(carry)
        carry -= u
        if u > 0:
            out.append({
                "id": "_ph%d" % r,
                "release": r,
                "deadline": min(H, r + int(p["phantom_deadline_len"])),
                "remaining_units": u,
                "phantom": True,
            })
    return out


def _greedy(real, cap, slot):
    disp = {}
    for j in sorted(real, key=lambda j: j["deadline"]):
        take = min(cap, j["remaining_units"])
        if take > 0:
            disp[j["id"]] = int(take)
            cap -= take
    return disp


def _lp(real, phantoms, cap, slot, H, costs, p):
    jobs = real + phantoms
    cols = []
    for k, j in enumerate(jobs):
        lo = max(int(j["release"]), slot)
        hi = min(int(j["deadline"]), H)
        for t in range(lo, hi):
            cols.append((k, t))
    nx = len(cols)
    nj = len(jobs)
    if nx == 0:
        return {}
    n = nx + nj
    c = np.zeros(n)
    for i, (k, t) in enumerate(cols):
        c[i] = costs[t] + p["time_eps"] * (t - slot)

    max_c = max(costs.values()) if costs else 1.0
    real_unmet = max(p.get("unmet_penalty", 100.0), max_c * 10.0)
    phantom_unmet = max(0.6, max_c * 0.7)

    for k, j in enumerate(jobs):
        c[nx + k] = phantom_unmet if j.get("phantom") else real_unmet

    r_idx, c_idx, vals = [], [], []
    for i, (k, t) in enumerate(cols):
        r_idx.append(k); c_idx.append(i); vals.append(1.0)
    for k in range(nj):
        r_idx.append(k); c_idx.append(nx + k); vals.append(1.0)
    A_eq = coo_matrix((vals, (r_idx, c_idx)), shape=(nj, n)).tocsr()
    b_eq = np.array([float(j["remaining_units"]) for j in jobs])

    slots = sorted({t for _, t in cols})
    sidx = {t: i for i, t in enumerate(slots)}
    r2, c2, v2 = [], [], []
    for i, (k, t) in enumerate(cols):
        r2.append(sidx[t]); c2.append(i); v2.append(1.0)
    A_ub = coo_matrix((v2, (r2, c2)), shape=(len(slots), n)).tocsr()
    b_ub = np.full(len(slots), float(cap))

    res = linprog(c, A_ub=A_ub, b_ub=b_ub, A_eq=A_eq, b_eq=b_eq,
                  bounds=(0, None), method="highs-ds")
    if not res.success:
        return None
    disp = {}
    for i, (k, t) in enumerate(cols):
        if t == slot and not jobs[k].get("phantom"):
            u = int(round(res.x[i]))
            if u > 0:
                disp[jobs[k]["id"]] = u
    return disp


def _sanitize(disp, real, cap):
    rem = {j["id"]: int(j["remaining_units"]) for j in real}
    dl = {j["id"]: j["deadline"] for j in real}
    out = {}
    for jid, u in disp.items():
        u = min(int(u), rem.get(jid, 0))
        if u > 0:
            out[jid] = u
    total = sum(out.values())
    for jid in sorted(out, key=lambda j: -dl[j]):
        if total <= cap:
            break
        cut = min(out[jid], total - cap)
        out[jid] -= cut
        total -= cut
    return {k: v for k, v in out.items() if v > 0}


def decide(observation: Dict[str, Any], state: Dict[str, Any]) -> Dict[str, Any]:
    """Optimizes work dispatch for the current half-hour slot."""
    p = _params()
    state = dict(state or {})
    slot = observation["slot"]
    H = observation.get("horizon_slots", 40)
    cap = int(observation["capacity_units"])
    jobs = observation.get("jobs", [])
    seen = set(state.get("seen", []))
    seen.update(j["id"] for j in jobs)
    state["seen"] = sorted(seen)

    real = [j for j in jobs if j["remaining_units"] > 0 and j["deadline"] > slot]
    if not real or cap <= 0 or observation.get("done"):
        return {"action": {"dispatch": {}}, "state": state}

    disp = None
    if HAVE_LP and np is not None and coo_matrix is not None:
        try:
            costs = _slot_costs(observation)
            ph = _phantoms(observation, state, p)
            disp = _lp(real, ph, cap, slot, H, costs, p)
        except Exception:
            disp = None
    if disp is None:
        disp = _greedy(real, cap, slot)
    disp = _sanitize(disp, real, cap)
    return {"action": {"dispatch": disp}, "state": state}
