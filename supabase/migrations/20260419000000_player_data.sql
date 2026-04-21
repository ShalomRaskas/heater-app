-- Players table: core identity + bio
create table if not exists public.players (
  id              uuid primary key default gen_random_uuid(),
  mlb_id          integer unique not null,
  full_name       text not null,
  team_abbr       text,
  position        text,
  jersey_number   integer,
  age             integer,
  height          text,       -- e.g. "6' 7\""
  weight          integer,    -- lbs
  bats            text,       -- L / R / S
  throws          text,       -- L / R
  headshot_url    text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Current season aggregate stats (batting + pitching, nullable by type)
create table if not exists public.player_stats_current (
  id                  uuid primary key default gen_random_uuid(),
  player_id           uuid references public.players(id) on delete cascade,
  season              integer not null,

  -- Shared / game volume
  games               integer,
  plate_appearances   integer,
  at_bats             integer,

  -- Batting stats (null for pitchers)
  avg                 numeric(5, 3),
  obp                 numeric(5, 3),
  slg                 numeric(5, 3),
  ops                 numeric(5, 3),
  wrc_plus            integer,
  babip               numeric(5, 3),
  home_runs           integer,
  rbi                 integer,
  stolen_bases        integer,
  strikeouts_batter   integer,
  walks_batter        integer,

  -- Pitching stats (null for position players)
  era                 numeric(5, 2),
  fip                 numeric(5, 2),
  whip                numeric(5, 3),
  innings_pitched     numeric(6, 1),
  strikeouts_pitcher  integer,
  wins                integer,
  losses              integer,
  saves               integer,

  -- Rate stats (both)
  k_rate              numeric(5, 3),  -- strikeout rate (0–1)
  bb_rate             numeric(5, 3),  -- walk rate (0–1)

  updated_at          timestamptz default now(),

  unique (player_id, season)
);

-- Pitch-level data per pitch type
create table if not exists public.player_pitch_data (
  id                    uuid primary key default gen_random_uuid(),
  player_id             uuid references public.players(id) on delete cascade,
  season                integer not null,
  pitch_type            text not null,   -- e.g. "FF", "SL", "CH"
  pitch_type_name       text,            -- e.g. "4-Seam Fastball"
  avg_velocity          numeric(5, 1),   -- mph
  usage_pct             numeric(5, 3),   -- 0–1
  horizontal_break_in   numeric(6, 2),   -- inches
  vertical_break_in     numeric(6, 2),   -- inches
  spin_rate             integer,         -- rpm
  whiff_rate            numeric(5, 3),   -- 0–1
  updated_at            timestamptz default now(),

  unique (player_id, season, pitch_type)
);

-- Enable RLS (rows readable by authenticated users; writes via service role only)
alter table public.players enable row level security;
alter table public.player_stats_current enable row level security;
alter table public.player_pitch_data enable row level security;

create policy "Authenticated users can read players"
  on public.players for select
  to authenticated using (true);

create policy "Authenticated users can read player stats"
  on public.player_stats_current for select
  to authenticated using (true);

create policy "Authenticated users can read pitch data"
  on public.player_pitch_data for select
  to authenticated using (true);
