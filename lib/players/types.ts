export interface PlayerSearchResult {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  position: string | null;
  teamId: number | null;
  teamName: string | null;
  teamAbbr: string | null;
  headshotUrl: string;
}
