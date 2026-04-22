import { NextResponse } from "next/server";
import type { PlayerSearchResult } from "@/lib/players/types";

const BASE = "https://statsapi.mlb.com/api/v1";

function headshotUrl(id: number): string {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_240,q_auto:best/v1/people/${id}/headshot/67/current`;
}

async function searchByName(q: string): Promise<PlayerSearchResult[]> {
  const url = `${BASE}/people/search?names=${encodeURIComponent(q)}&sportId=1`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = await res.json();
  const people: Array<Record<string, unknown>> = data.people ?? [];
  return people
    .filter((p) => p.active)
    .slice(0, 20)
    .map((p) => ({
      id: p.id as number,
      fullName: p.fullName as string,
      firstName: p.firstName as string,
      lastName: p.lastName as string,
      position: (p.primaryPosition as { abbreviation: string } | undefined)?.abbreviation ?? null,
      teamId: (p.currentTeam as { id: number } | undefined)?.id ?? null,
      teamName: (p.currentTeam as { name: string } | undefined)?.name ?? null,
      teamAbbr: null,
      headshotUrl: headshotUrl(p.id as number),
    }));
}

async function rosterByTeam(teamId: string): Promise<PlayerSearchResult[]> {
  const url = `${BASE}/teams/${teamId}/roster?rosterType=active&season=2026&hydrate=person(currentTeam)`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data = await res.json();
  const roster: Array<Record<string, unknown>> = data.roster ?? [];

  // Get team info
  const teamRes = await fetch(`${BASE}/teams/${teamId}`, { next: { revalidate: 86400 } });
  let teamName: string | null = null;
  let teamAbbr: string | null = null;
  if (teamRes.ok) {
    const td = await teamRes.json();
    const t = td.teams?.[0];
    teamName = t?.name ?? null;
    teamAbbr = t?.abbreviation ?? null;
  }

  return roster.map((entry) => {
    const person = entry.person as Record<string, unknown>;
    const pos = entry.position as { abbreviation: string } | undefined;
    return {
      id: person.id as number,
      fullName: person.fullName as string,
      firstName: (person.firstName as string | undefined) ?? "",
      lastName: (person.lastName as string | undefined) ?? "",
      position: pos?.abbreviation ?? null,
      teamId: Number(teamId),
      teamName,
      teamAbbr,
      headshotUrl: headshotUrl(person.id as number),
    };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const team = searchParams.get("team")?.trim();

  if (!q && !team) {
    return NextResponse.json({ players: [] });
  }

  const players = team ? await rosterByTeam(team) : await searchByName(q!);
  return NextResponse.json({ players });
}
