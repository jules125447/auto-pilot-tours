import type { TurnDirection } from "@/components/navigation/DirectionBanner";
import type { RouteStep } from "@/lib/routing";

/* ------------------------------------------------------------------ */
/* Geo helpers                                                         */
/* ------------------------------------------------------------------ */

const R_EARTH = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Signed bearing delta in [-180, 180]; positive = right, negative = left. */
function angleDelta(from: number, to: number): number {
  let d = ((to - from + 540) % 360) - 180;
  return d;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface TurnInstruction {
  direction: TurnDirection;
  /** Cumulative meters from route[0] to the turn pivot. */
  distanceFromStart: number;
  /** Index into the route polyline where the turn pivots. */
  pointIndex: number;
  lat: number;
  lng: number;
  /** Total absolute angle in degrees (useful for sharpness). */
  angleDeg?: number;
  /** Roundabout exit number (1..N), only when direction === "roundabout". */
  roundaboutExit?: number;
}

export interface NextTurnResult {
  turn: TurnInstruction;
  /** Distance along the route from user (snapped) to the turn pivot, in meters. */
  distanceToTurn: number;
  afterTurn?: TurnInstruction;
  distAfter?: number;
}

/* ------------------------------------------------------------------ */
/* Cumulative arc-length cache                                         */
/* ------------------------------------------------------------------ */

const cumDistCache = new WeakMap<[number, number][], number[]>();

function cumulativeDistances(route: [number, number][]): number[] {
  const cached = cumDistCache.get(route);
  if (cached) return cached;
  const arr = new Array<number>(route.length);
  arr[0] = 0;
  for (let i = 1; i < route.length; i++) {
    arr[i] = arr[i - 1] + haversine(route[i - 1][0], route[i - 1][1], route[i][0], route[i][1]);
  }
  cumDistCache.set(route, arr);
  return arr;
}

/* ------------------------------------------------------------------ */
/* Snap-to-route projection                                            */
/* ------------------------------------------------------------------ */

export interface SnapResult {
  lat: number;
  lng: number;
  /** Index of the segment start vertex. snapped point lies between route[seg] and route[seg+1]. */
  segmentIndex: number;
  /** Cumulative distance from route start to snapped point (meters). */
  distanceFromStart: number;
  /** Perpendicular distance from raw user position to the route (meters). */
  lateralDistance: number;
}

/**
 * Project (lat,lng) onto the polyline; returns the closest point on the route.
 * Uses an equirectangular local projection (accurate within a few km of `lat`).
 */
export function snapToRoute(route: [number, number][], lat: number, lng: number): SnapResult | null {
  if (route.length < 2) {
    if (route.length === 1) {
      return {
        lat: route[0][0],
        lng: route[0][1],
        segmentIndex: 0,
        distanceFromStart: 0,
        lateralDistance: haversine(lat, lng, route[0][0], route[0][1]),
      };
    }
    return null;
  }

  const cum = cumulativeDistances(route);
  const cosLat = Math.cos(toRad(lat));
  const M_PER_DEG_LAT = 110574; // average
  const M_PER_DEG_LNG = 111320 * cosLat;

  let bestSeg = 0;
  let bestT = 0;
  let bestDist2 = Infinity;
  let bestProjX = 0;
  let bestProjY = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const ax = (route[i][1] - lng) * M_PER_DEG_LNG;
    const ay = (route[i][0] - lat) * M_PER_DEG_LAT;
    const bx = (route[i + 1][1] - lng) * M_PER_DEG_LNG;
    const by = (route[i + 1][0] - lat) * M_PER_DEG_LAT;
    const dx = bx - ax;
    const dy = by - ay;
    const segLen2 = dx * dx + dy * dy;
    let t = 0;
    if (segLen2 > 1e-9) {
      t = -(ax * dx + ay * dy) / segLen2;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
    }
    const px = ax + t * dx;
    const py = ay + t * dy;
    const d2 = px * px + py * py;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      bestSeg = i;
      bestT = t;
      bestProjX = px;
      bestProjY = py;
    }
  }

  const snappedLat = lat + bestProjY / M_PER_DEG_LAT;
  const snappedLng = lng + bestProjX / M_PER_DEG_LNG;
  const segLen = cum[bestSeg + 1] - cum[bestSeg];
  const distanceFromStart = cum[bestSeg] + segLen * bestT;
  const lateralDistance = Math.sqrt(bestDist2);

  return {
    lat: snappedLat,
    lng: snappedLng,
    segmentIndex: bestSeg,
    distanceFromStart,
    lateralDistance,
  };
}

/* ------------------------------------------------------------------ */
/* OSRM modifier -> internal TurnDirection                             */
/* ------------------------------------------------------------------ */

function osrmModifierToDirection(mod?: string): TurnDirection | null {
  if (!mod) return null;
  const m = mod.toLowerCase();
  if (m === "uturn") return "u-turn";
  if (m.includes("left")) return "left";
  if (m.includes("right")) return "right";
  if (m === "straight") return "straight";
  return null;
}

function closestRouteIndex(route: [number, number][], lat: number, lng: number): number {
  // Coarse nearest-vertex (used only for OSRM step anchoring, not for distances)
  let minD = Infinity;
  let idx = 0;
  for (let i = 0; i < route.length; i++) {
    const d = (route[i][0] - lat) ** 2 + (route[i][1] - lng) ** 2;
    if (d < minD) {
      minD = d;
      idx = i;
    }
  }
  return idx;
}

/* ------------------------------------------------------------------ */
/* Smoothed-curvature turn extraction                                  */
/* ------------------------------------------------------------------ */

/** Returns the bearing averaged over a window of ~`windowM` meters before/after `i`. */
function smoothedBearing(
  route: [number, number][],
  cum: number[],
  i: number,
  direction: "before" | "after",
  windowM = 25
): number | null {
  if (direction === "before") {
    let j = i;
    while (j > 0 && cum[i] - cum[j] < windowM) j--;
    if (j === i) return null;
    return bearing(route[j][0], route[j][1], route[i][0], route[i][1]);
  } else {
    let j = i;
    while (j < route.length - 1 && cum[j] - cum[i] < windowM) j++;
    if (j === i) return null;
    return bearing(route[i][0], route[i][1], route[j][0], route[j][1]);
  }
}

/**
 * Extract turn instructions.
 *
 * Strategy:
 *   1. If OSRM steps are provided, use them directly (most reliable).
 *   2. Otherwise, fall back to smoothed-bearing curvature detection on the
 *      polyline with vertex clustering to avoid duplicate announcements for
 *      a single physical turn split across multiple closely-spaced vertices.
 */
export function extractTurns(route: [number, number][], steps?: RouteStep[]): TurnInstruction[] {
  if (route.length < 3) return [];
  const cum = cumulativeDistances(route);

  /* ---------- Path A: OSRM-provided steps ---------- */
  if (steps && steps.length > 0) {
    const turns: TurnInstruction[] = [];
    for (const step of steps) {
      const mt = step.maneuver.type;
      const mod = step.maneuver.modifier;
      const [lng, lat] = step.maneuver.location;
      const idx = closestRouteIndex(route, lat, lng);

      let dir: TurnDirection | null = null;
      let exit: number | undefined;

      if (
        mt === "roundabout" ||
        mt === "rotary" ||
        mt === "roundabout turn" ||
        mt === "exit roundabout" ||
        mt === "exit rotary"
      ) {
        if (step.maneuver.exit) {
          dir = "roundabout";
          exit = step.maneuver.exit;
        }
      } else if (mt === "turn" || mt === "end of road" || mt === "fork" || mt === "on ramp" || mt === "off ramp" || mt === "merge" || mt === "continue") {
        dir = osrmModifierToDirection(mod);
        // ignore "straight" / "slight" — those aren't announceable turns
        if (dir === "straight") dir = null;
      } else if (mt === "arrive") {
        dir = "arrive";
      }

      if (!dir) continue;

      // Dedup: skip if too close to the previous turn (<25 m along route)
      const last = turns[turns.length - 1];
      if (last && cum[idx] - last.distanceFromStart < 25) continue;

      turns.push({
        direction: dir,
        distanceFromStart: cum[idx],
        pointIndex: idx,
        lat: route[idx][0],
        lng: route[idx][1],
        roundaboutExit: exit,
      });
    }
    return turns;
  }

  /* ---------- Path B: curvature fallback ---------- */
  // Per-vertex smoothed angle delta (positive = right, negative = left).
  type Cand = { i: number; angle: number };
  const candidates: Cand[] = [];

  for (let i = 1; i < route.length - 1; i++) {
    const before = smoothedBearing(route, cum, i, "before", 25);
    const after = smoothedBearing(route, cum, i, "after", 25);
    if (before === null || after === null) continue;
    const delta = angleDelta(before, after);
    if (Math.abs(delta) >= 25) candidates.push({ i, angle: delta });
  }

  // Cluster candidates within 20 m along the route into a single turn.
  const turns: TurnInstruction[] = [];
  let cluster: Cand[] = [];

  const flushCluster = () => {
    if (cluster.length === 0) return;
    // Total signed angle through the cluster.
    const total = cluster.reduce((s, c) => s + c.angle, 0);
    // Pivot = vertex with the maximum |angle| in the cluster.
    const pivot = cluster.reduce((a, b) => (Math.abs(b.angle) > Math.abs(a.angle) ? b : a));
    const absTotal = Math.abs(total);

    let dir: TurnDirection = "straight";
    if (absTotal >= 150) dir = "u-turn";
    else if (absTotal >= 35) dir = total > 0 ? "right" : "left";

    if (dir !== "straight") {
      turns.push({
        direction: dir,
        distanceFromStart: cum[pivot.i],
        pointIndex: pivot.i,
        lat: route[pivot.i][0],
        lng: route[pivot.i][1],
        angleDeg: absTotal,
      });
    }
    cluster = [];
  };

  for (const c of candidates) {
    if (cluster.length === 0) {
      cluster.push(c);
      continue;
    }
    const last = cluster[cluster.length - 1];
    if (cum[c.i] - cum[last.i] <= 20) {
      cluster.push(c);
    } else {
      flushCluster();
      cluster.push(c);
    }
  }
  flushCluster();

  // Final dedup pass: drop turns within 30 m of each other (keep sharper one).
  const dedup: TurnInstruction[] = [];
  for (const t of turns) {
    const prev = dedup[dedup.length - 1];
    if (prev && t.distanceFromStart - prev.distanceFromStart < 30) {
      if ((t.angleDeg ?? 0) > (prev.angleDeg ?? 0)) dedup[dedup.length - 1] = t;
      continue;
    }
    dedup.push(t);
  }
  return dedup;
}

/* ------------------------------------------------------------------ */
/* Locate next upcoming turn using snap-to-route                       */
/* ------------------------------------------------------------------ */

export function findNextTurn(
  userLat: number,
  userLng: number,
  route: [number, number][],
  turns: TurnInstruction[]
): NextTurnResult | null {
  if (turns.length === 0 || route.length < 2) return null;

  const snap = snapToRoute(route, userLat, userLng);
  if (!snap) return null;

  // If GPS is wildly off-route (>120 m), don't try to announce — caller can
  // fall back to "recalculating" UI.
  if (snap.lateralDistance > 120) return null;

  const userDist = snap.distanceFromStart;

  // Find next turn whose pivot lies ahead of the user along the route.
  // Add a small backward tolerance (10 m) so we don't drop a turn the instant
  // we cross its pivot — the announcement loop still wants to say "now".
  for (let t = 0; t < turns.length; t++) {
    if (turns[t].distanceFromStart >= userDist - 10) {
      const distanceToTurn = Math.max(0, turns[t].distanceFromStart - userDist);
      const afterTurn = turns[t + 1];
      const distAfter = afterTurn
        ? Math.max(0, afterTurn.distanceFromStart - turns[t].distanceFromStart)
        : undefined;
      return { turn: turns[t], distanceToTurn, afterTurn, distAfter };
    }
  }
  return null;
}

export { haversine, snapToRoute as projectOntoRoute };
