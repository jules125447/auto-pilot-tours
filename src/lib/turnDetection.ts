import type { TurnDirection } from "@/components/navigation/DirectionBanner";

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface TurnInstruction {
  direction: TurnDirection;
  distanceFromStart: number; // meters from route start to this turn
  pointIndex: number;
  lat: number;
  lng: number;
}

/** Analyze a route polyline and extract turn points */
export function extractTurns(route: [number, number][]): TurnInstruction[] {
  if (route.length < 3) return [];

  const turns: TurnInstruction[] = [];
  let cumDist = 0;

  for (let i = 1; i < route.length - 1; i++) {
    const segDist = haversine(route[i - 1][0], route[i - 1][1], route[i][0], route[i][1]);
    cumDist += segDist;

    const b1 = bearing(route[i - 1][0], route[i - 1][1], route[i][0], route[i][1]);
    const b2 = bearing(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);

    let angleDiff = b2 - b1;
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;

    let dir: TurnDirection = "straight";
    if (angleDiff > 30 && angleDiff <= 150) dir = "right";
    else if (angleDiff < -30 && angleDiff >= -150) dir = "left";
    else if (Math.abs(angleDiff) > 150) dir = "u-turn";

    if (dir !== "straight") {
      // Skip if too close to previous turn (< 30m)
      const lastTurn = turns[turns.length - 1];
      if (lastTurn && cumDist - lastTurn.distanceFromStart < 30) continue;

      turns.push({
        direction: dir,
        distanceFromStart: cumDist,
        pointIndex: i,
        lat: route[i][0],
        lng: route[i][1],
      });
    }
  }

  return turns;
}

/** Find the nearest upcoming turn from user position */
export function findNextTurn(
  userLat: number,
  userLng: number,
  route: [number, number][],
  turns: TurnInstruction[]
): { turn: TurnInstruction; distanceToTurn: number; afterTurn?: TurnInstruction; distAfter?: number } | null {
  if (turns.length === 0) return null;

  // Find closest route point to user
  let minDist = Infinity;
  let closestIdx = 0;
  for (let i = 0; i < route.length; i++) {
    const d = haversine(userLat, userLng, route[i][0], route[i][1]);
    if (d < minDist) {
      minDist = d;
      closestIdx = i;
    }
  }

  // Find next turn ahead of user
  for (let t = 0; t < turns.length; t++) {
    if (turns[t].pointIndex > closestIdx) {
      // Calculate distance from user to this turn via route
      let d = haversine(userLat, userLng, route[closestIdx][0], route[closestIdx][1]);
      for (let i = closestIdx; i < turns[t].pointIndex; i++) {
        d += haversine(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
      }

      const afterTurn = turns[t + 1];
      let distAfter: number | undefined;
      if (afterTurn) {
        distAfter = 0;
        for (let i = turns[t].pointIndex; i < afterTurn.pointIndex; i++) {
          distAfter += haversine(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
        }
      }

      return { turn: turns[t], distanceToTurn: d, afterTurn, distAfter };
    }
  }

  return null;
}

export { haversine };
