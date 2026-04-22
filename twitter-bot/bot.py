"""
Heater Twitter Bot
------------------
Searches Twitter for MLB player mentions, replies with a Heater player card image.

Usage:
    python bot.py                     # run once
    python bot.py --loop 30           # run every 30 minutes
    python bot.py --headless          # no browser window
"""

import argparse
import io
import json
import os
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, Page
from playwright_stealth import Stealth

from players import find_player_id

load_dotenv()

TWITTER_USERNAME  = os.environ["TWITTER_USERNAME"]
TWITTER_PASSWORD  = os.environ["TWITTER_PASSWORD"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
HEATER_BASE_URL   = os.getenv("HEATER_BASE_URL", "https://app.heaterbaseball.app")


PROFILE_DIR  = Path(__file__).parent / "chrome_profile"

# ── Target accounts (checked first, in order) ────────────────────────────────
# Verify handles marked with # ? if unsure
TARGET_ACCOUNTS = [
    # Priority accounts
    "MLB",
    "BleacherReport",
    "TalkinBaseball_",    # Talkin Baseball
    "JomBoyMedia",        # Jom Boy
    "GiraffeNeckMarc",    # Giraffe Neck Marc
    "fuzzyfromyt",        # Fuzzy from YouTube

    # All 30 MLB teams
    "Dbacks",             # Arizona Diamondbacks
    "Braves",             # Atlanta Braves
    "Orioles",            # Baltimore Orioles
    "RedSox",             # Boston Red Sox
    "Cubs",               # Chicago Cubs
    "whitesox",           # Chicago White Sox
    "Reds",               # Cincinnati Reds
    "CleGuardians",       # Cleveland Guardians
    "Rockies",            # Colorado Rockies
    "tigers",             # Detroit Tigers
    "astros",             # Houston Astros
    "Royals",             # Kansas City Royals
    "Angels",             # LA Angels
    "Dodgers",            # LA Dodgers
    "Marlins",            # Miami Marlins
    "Brewers",            # Milwaukee Brewers
    "Twins",              # Minnesota Twins
    "Mets",               # New York Mets
    "Yankees",            # New York Yankees
    "Athletics",          # Oakland Athletics
    "Phillies",           # Philadelphia Phillies
    "Pirates",            # Pittsburgh Pirates
    "Padres",             # San Diego Padres
    "SFGiants",           # San Francisco Giants
    "Mariners",           # Seattle Mariners
    "Cardinals",          # St. Louis Cardinals
    "RaysBaseball",       # Tampa Bay Rays
    "Rangers",            # Texas Rangers
    "BlueJays",           # Toronto Blue Jays
    "Nationals",          # Washington Nationals
]

# Fallback keyword searches (used after target accounts are exhausted)
SEARCH_QUERIES = [
    "#MLB",
    "#BaseballTwitter",
    "MLB stats",
]

# How many tweets to attempt to reply to per cycle
MAX_REPLIES_PER_CYCLE = 8

# Replied tweet IDs — persisted so we don't double-reply across restarts
REPLIED_FILE = Path(__file__).parent / "replied_ids.json"


# ── Helpers ──────────────────────────────────────────────────────────────────

def load_replied() -> set[str]:
    if REPLIED_FILE.exists():
        return set(json.loads(REPLIED_FILE.read_text()))
    return set()


def save_replied(ids: set[str]) -> None:
    # Keep last 5000 so file doesn't grow forever
    trimmed = list(ids)[-5000:]
    REPLIED_FILE.write_text(json.dumps(trimmed))


def extract_player(tweet_text: str) -> str | None:
    """
    Return a player name only if the tweet is primarily about them.
    'Primarily' = their name appears in the first 120 chars OR
    the tweet mentions them by full name (first + last).
    Single last-name matches only count if they're in the first 120 chars.
    """
    import re
    from players import PLAYER_IDS
    text_lower = tweet_text.lower()
    first_120  = text_lower[:120]

    # Sort longest first so "aaron judge" matches before "judge"
    for name in sorted(PLAYER_IDS.keys(), key=len, reverse=True):
        if not re.search(rf"\b{re.escape(name)}\b", text_lower):
            continue
        is_full_name   = " " in name                          # two+ words
        in_first_120   = re.search(rf"\b{re.escape(name)}\b", first_120)
        if is_full_name or in_first_120:
            return name.title()

    return None


HEATER_SIGNUP = "heaterbaseball.app"

CAPTIONS = [
    "Pulled up {name}'s {season} stat line — this is from Heater, an MLB analytics tool I've been building. Shows AVG, OBP, wRC+, hard hit rate, all that. If you're into the numbers, check it out at {link}",
    "Since we're on {name} — dropped their {season} numbers here. Made a tool called Heater for exactly this. Statcast data, spray charts, pitch arsenals, all in one place. {link} if you want to dig in",
    "Here's {name}'s full {season} card from Heater. It's a baseball analytics platform I built — you can look up any MLB player, see their stats, pitch breakdown, spray charts. Still growing it but it's free to try: {link}",
    "Not gonna lie, {name}'s {season} numbers are worth a look. Made this with Heater — baseball analytics I've been working on. You can pull any player's card, spray charts, pitch profiles. Try it at {link}",
    "{name}'s {season} stat card from Heater. Been building this as a way to make statcast data actually readable. ERA, FIP, wRC+ — whatever you care about, it's all there. {link}",
    "Since everyone's talking {name} right now — here's their {season} data from Heater. Built this so you can actually dig into the numbers without wading through Baseball Reference. {link}",
    "Real quick {name} {season} breakdown from Heater. It's a baseball analytics platform I built — pitch arsenals, spray charts, hot zones, all the statcast stuff people actually want to see. {link}",
    "{name} numbers just dropped their {season} line — pulled this from Heater. Free baseball analytics tool, you can look up any MLB player. {link}",
]

BASEBALL_KEYWORDS = {
    "mlb", "baseball", "pitcher", "batting", "batter", "strikeout", "homerun",
    "home run", "inning", "bullpen", "outfield", "shortstop", "catcher",
    "fastball", "curveball", "slider", "changeup", "era", "whip", "obp",
    "slugging", "wrc", "war", "fip", "babip", "rbi", "stolen base",
    "world series", "playoffs", "spring training", "minor league", "lineup",
    "rotation", "closer", "reliever", "at bat", "plate appearance", "walk-off",
    "grand slam", "no-hitter", "perfect game", "cy young", "mvp",
}

def is_baseball_tweet(text: str) -> bool:
    """Return True only if the tweet is clearly about baseball."""
    lower = text.lower()
    return any(kw in lower for kw in BASEBALL_KEYWORDS)


def detect_season(tweet_text: str) -> int:
    """Return the season year mentioned in the tweet, defaulting to current year."""
    import re
    # Look for explicit year mentions
    years = re.findall(r"\b(202[3-9]|2030)\b", tweet_text)
    if years:
        return int(years[-1])
    # Default to current season
    return 2026

def build_caption(player_name: str, season: int) -> str:
    import random
    template = random.choice(CAPTIONS)
    return template.format(name=player_name, season=season, link=HEATER_SIGNUP)


VIZ_TYPES = ["player_card", "player_card", "arsenal", "arsenal", "spray_chart", "pitch_movement"]
# arsenal and player_card weighted higher — other types added as endpoints are built

VIZ_CAPTIONS = {
    "player_card": CAPTIONS,
    "arsenal": [
        "Here's {name}'s full pitch arsenal for {season} via Heater. Built this to show exactly what every pitcher is working with — velocity, usage, whiff rates by pitch type. Full breakdown at {link}",
        "{name}'s stuff in {season}, pitch by pitch. This is from Heater — been building it to make pitch data actually useful for fans who care about this stuff. Every pitch, how often they throw it, how it moves, how batters handle it. {link}",
        "Look at {name}'s pitch mix this {season}. This is Heater, a baseball analytics platform I've been building. Arsenal charts, movement profiles, all the statcast pitch data in one place. {link}",
        "Pulled {name}'s {season} pitch arsenal from Heater. It's a free baseball analytics tool built for people who actually want to dig into pitching. Worth a look if you follow this stuff: {link}",
        "Since we're talking about {name} — here's their full pitch arsenal for {season} from Heater. You can see velocity, whiff rate, and usage for every pitch they throw. Check out the rest of the platform at {link}",
    ],
    "spray_chart": [
        "Here's where {name} is putting the ball in {season} — spray chart from Heater. Been building this platform to make this kind of visual data available for any MLB player. {link}",
        "The {name} spray chart for {season} from Heater tells a story. Pull up any hitter's batted ball distribution, hot zones, exit velocity — all the statcast stuff. {link}",
        "{name}'s batted ball distribution in {season} via Heater. Built this for fans who want to actually see where hitters do damage, not just read a stat line. {link}",
        "Where {name} does damage in {season} — from Heater, a baseball analytics platform I built. Spray charts, hot zones, statcast exit velo for any MLB hitter. {link}",
    ],
    "pitch_movement": [
        "Here's {name}'s pitch movement profile for {season} from Heater. Horizontal and vertical break on every pitch, plus usage and velo. Full breakdown at {link}",
        "{name}'s pitch movement in {season} via Heater. Built this to show the actual physics of what each pitcher is doing — this is why some pitches are so hard to hit. {link}",
        "{name}'s stuff this {season} — movement breakdown from Heater. Been building this platform so you can actually see why a slider goes where it goes. {link}",
        "Pitch movement on {name} in {season} from Heater. Every pitch, how much it moves, how often they throw it. More visualizations available at {link}",
    ],
}

def fetch_viz_image(player_id: int, viz_type: str, season: int) -> bytes | None:
    """Download the appropriate OG image from our endpoint."""
    if viz_type == "arsenal":
        url = f"{HEATER_BASE_URL}/api/og/arsenal/{player_id}?season={season}"
    elif viz_type == "spray_chart":
        url = f"{HEATER_BASE_URL}/api/og/spray/{player_id}?season={season}"
    elif viz_type == "pitch_movement":
        url = f"{HEATER_BASE_URL}/api/og/pitches/{player_id}?season={season}"
    else:
        url = f"{HEATER_BASE_URL}/api/og/player/{player_id}?season={season}"

    try:
        r = requests.get(url, timeout=60)
        ct = r.headers.get("content-type", "")
        print(f"    viz: {viz_type} | url: {url}")
        print(f"    status: {r.status_code}")
        if r.status_code == 200 and "image" in ct:
            return r.content
        # Fallback to player card if the viz endpoint isn't built yet
        if viz_type != "player_card":
            print(f"    {viz_type} endpoint not ready, falling back to player card")
            fallback = f"{HEATER_BASE_URL}/api/og/player/{player_id}?season={season}"
            r2 = requests.get(fallback, timeout=60)
            if r2.status_code == 200 and "image" in r2.headers.get("content-type", ""):
                return r2.content
    except Exception as e:
        print(f"    viz fetch error: {e}")
    return None


# ── Twitter automation ───────────────────────────────────────────────────────

def save_cookies(page: Page) -> None:
    cookies = page.context.cookies()
    COOKIES_FILE.write_text(json.dumps(cookies))
    print("  [auth] cookies saved")


def load_cookies(page: Page) -> bool:
    if not COOKIES_FILE.exists():
        return False
    cookies = json.loads(COOKIES_FILE.read_text())
    page.context.add_cookies(cookies)
    return True


def is_logged_in(page: Page) -> bool:
    page.goto("https://x.com/home", timeout=20000)
    page.wait_for_timeout(3000)
    return "home" in page.url and page.locator('[data-testid="SideNav_NewTweet_Button"]').count() > 0


def _type_slowly(page: Page, selector: str, text: str) -> None:
    """Type one character at a time with small random-ish delays."""
    el = page.locator(selector).first
    el.click()
    for ch in text:
        el.type(ch, delay=80)
        page.wait_for_timeout(40)


def login(page: Page) -> None:
    print("  [auth] logging in…")
    print("  [auth] NOTE: complete any verification prompts manually in the browser window")

    page.goto("https://x.com/i/flow/login", timeout=30000)
    page.wait_for_load_state("networkidle", timeout=15000)
    page.wait_for_timeout(2000)

    # Step 1: username
    username_input = page.locator('input[autocomplete="username"]')
    username_input.wait_for(state="visible", timeout=20000)
    username_input.click()
    page.wait_for_timeout(800)
    _type_slowly(page, 'input[autocomplete="username"]', TWITTER_USERNAME)
    page.wait_for_timeout(800)
    page.keyboard.press("Tab")
    page.wait_for_timeout(300)
    page.keyboard.press("Enter")
    page.wait_for_timeout(3000)

    # Step 2: optional phone/username verification
    unusual = page.locator('input[data-testid="ocfEnterTextTextInput"]')
    if unusual.count() > 0:
        print("  [auth] extra verification step — filling username…")
        unusual.click()
        _type_slowly(page, 'input[data-testid="ocfEnterTextTextInput"]', TWITTER_USERNAME)
        page.keyboard.press("Enter")
        page.wait_for_timeout(3000)

    # Step 3: password — wait up to 60s so user can handle any manual prompt
    password_input = page.locator('input[type="password"]')
    try:
        password_input.wait_for(state="visible", timeout=60000)
    except Exception:
        print(f"  [auth] password field never appeared — URL: {page.url}")
        raise RuntimeError("Could not find password field. Twitter may be blocking automation.")

    password_input.click()
    page.wait_for_timeout(800)
    _type_slowly(page, 'input[type="password"]', TWITTER_PASSWORD)
    page.wait_for_timeout(800)
    page.keyboard.press("Enter")
    page.wait_for_timeout(6000)

    if "home" not in page.url:
        print(f"  [auth] current URL: {page.url}")
        print("  [auth] waiting up to 60s for you to complete any verification…")
        page.wait_for_url("**/home", timeout=60000)

    save_cookies(page)
    print("  [auth] logged in successfully")


def ensure_authenticated(page: Page) -> None:
    if load_cookies(page) and is_logged_in(page):
        print("  [auth] session restored from cookies")
        return
    login(page)


def scrape_profile_tweets(page: Page, handle: str, max_tweets: int = 20) -> list[dict]:
    """Grab recent tweets from a specific account's timeline."""
    page.goto(f"https://x.com/{handle}", timeout=20000)
    page.wait_for_load_state("domcontentloaded", timeout=15000)
    page.wait_for_timeout(3000)

    tweets = []
    seen_ids: set[str] = set()

    for _ in range(3):  # scroll up to 3 times
        articles = page.locator("article[data-testid='tweet']").all()
        for article in articles:
            if len(tweets) >= max_tweets:
                break
            try:
                text_el = article.locator('[data-testid="tweetText"]')
                text = text_el.inner_text() if text_el.count() > 0 else ""

                time_el = article.locator("time").first
                link = time_el.locator("..").get_attribute("href") if time_el.count() > 0 else None
                tweet_id = link.split("/")[-1] if link else None

                if tweet_id and text and tweet_id not in seen_ids:
                    seen_ids.add(tweet_id)
                    tweets.append({"id": tweet_id, "text": text, "handle": handle, "link": link})
            except Exception:
                continue

        if len(tweets) >= max_tweets:
            break
        page.evaluate("window.scrollBy(0, 1500)")
        page.wait_for_timeout(1500)

    return tweets


def search_tweets(page: Page, query: str, max_tweets: int = 40) -> list[dict]:
    """Search Top tweets (highest engagement) and return up to max_tweets."""
    encoded = requests.utils.quote(query)
    # Go directly to Top tab — highest engagement, naturally filters big accounts
    page.goto(f"https://x.com/search?q={encoded}&src=typed_query", timeout=20000)
    page.wait_for_load_state("domcontentloaded", timeout=15000)
    page.wait_for_timeout(3000)

    # Make sure we're on Top, not Latest
    top_tab = page.locator('[role="tab"]:has-text("Top")')
    if top_tab.count() > 0:
        top_tab.first.click()
        page.wait_for_timeout(2000)

    tweets = []
    seen_ids: set[str] = set()

    # Scroll to load more tweets
    for scroll_round in range(4):
        articles = page.locator("article[data-testid='tweet']").all()
        for article in articles:
            if len(tweets) >= max_tweets:
                break
            try:
                text_el = article.locator('[data-testid="tweetText"]')
                text = text_el.inner_text() if text_el.count() > 0 else ""

                time_el = article.locator("time").first
                link = time_el.locator("..").get_attribute("href") if time_el.count() > 0 else None
                tweet_id = link.split("/")[-1] if link else None

                handle_el = article.locator('[data-testid="User-Name"] a').first
                handle = handle_el.get_attribute("href", timeout=1000).lstrip("/") if handle_el.count() > 0 else ""
                # handle may be "username" or "username/status/..." — take first segment
                handle = handle.split("/")[0]

                if tweet_id and text and tweet_id not in seen_ids:
                    seen_ids.add(tweet_id)
                    tweets.append({"id": tweet_id, "text": text, "handle": handle, "link": link})
            except Exception:
                continue

        if len(tweets) >= max_tweets:
            break
        # Scroll down to load more
        page.evaluate("window.scrollBy(0, 1500)")
        page.wait_for_timeout(2000)

    return tweets


def parse_follower_text(text: str) -> int | None:
    """Parse '12.4K', '1.2M', '892' into an integer."""
    import re
    text = text.strip().replace(",", "")
    m = re.search(r"([\d.]+)\s*([KkMm]?)", text)
    if not m:
        return None
    val = float(m.group(1))
    suffix = m.group(2).upper()
    if suffix == "K":
        val *= 1_000
    elif suffix == "M":
        val *= 1_000_000
    return int(val)


def get_follower_count(page: Page, handle: str) -> int | None:
    """Visit a profile and return follower count, or None if unreadable."""
    try:
        page.goto(f"https://x.com/{handle}", timeout=15000)
        page.wait_for_timeout(2500)

        # Try the followers link — href ends with /followers
        for selector in [
            f'a[href="/{handle}/followers"]',
            'a[href$="/followers"]',
        ]:
            el = page.locator(selector).first
            if el.count() > 0:
                text = el.inner_text(timeout=3000)
                count = parse_follower_text(text)
                if count is not None:
                    return count

        # Fallback: scan all text on the page for "X Followers" pattern
        import re
        body = page.inner_text("body")
        m = re.search(r"([\d,.]+[KkMm]?)\s*Followers", body)
        if m:
            return parse_follower_text(m.group(1))

        return None
    except Exception:
        return None


def reply_with_image(page: Page, tweet_link: str, caption: str, image_bytes: bytes) -> bool:
    """Navigate to the tweet and post a reply with an image."""
    try:
        page.goto(f"https://x.com{tweet_link}", timeout=20000)
        page.wait_for_timeout(2500)

        # Click reply button on the main tweet
        reply_btn = page.locator('[data-testid="reply"]').first
        reply_btn.click()
        page.wait_for_timeout(2000)

        # Type caption
        composer = page.locator('[data-testid="tweetTextarea_0"]').first
        composer.wait_for(state="visible", timeout=10000)
        composer.click()
        composer.type(caption, delay=40)
        page.wait_for_timeout(800)

        # Attach image — set files directly without clicking (avoids viewport issue)
        tmp_path = Path(__file__).parent / "_card_tmp.png"
        tmp_path.write_bytes(image_bytes)
        file_input = page.locator('[data-testid="fileInput"]').first
        file_input.set_input_files(str(tmp_path))
        page.wait_for_timeout(3000)

        # Submit
        page.locator('[data-testid="tweetButtonInline"]').click()
        page.wait_for_timeout(3000)

        tmp_path.unlink(missing_ok=True)
        return True
    except Exception as e:
        print(f"  [warn] reply failed: {e}")
        return False


# ── Main loop ────────────────────────────────────────────────────────────────

def run_cycle(headless: bool) -> None:
    if not PROFILE_DIR.exists():
        print("No Chrome profile found. Run: python save_session.py")
        sys.exit(1)

    replied = load_replied()
    replies_this_cycle = 0

    with sync_playwright() as pw:
      context = pw.chromium.launch_persistent_context(
          user_data_dir=str(PROFILE_DIR),
          headless=headless,
          channel="chrome",
          viewport={"width": 1280, "height": 900},
          args=["--disable-blink-features=AutomationControlled"],
          ignore_default_args=["--enable-automation"],
      )
      page = context.new_page()
      Stealth().apply_stealth_sync(page)

      # Verify still logged in
      page.goto("https://x.com/home", timeout=20000)
      page.wait_for_timeout(3000)
      if "home" not in page.url:
          print("Session expired — run: python save_session.py")
          context.close()
          sys.exit(1)

      try:
        print("  [ok] session active, starting search…")

        def process_tweets(tweets: list[dict], source: str) -> None:
            nonlocal replies_this_cycle
            for tweet in tweets:
                if replies_this_cycle >= MAX_REPLIES_PER_CYCLE:
                    return

                tid = tweet["id"]
                if tid in replied:
                    continue

                if tweet["handle"].lower() in (TWITTER_USERNAME.lower(), "heaterbaseball"):
                    replied.add(tid)
                    continue

                print(f"\n  [{source}] @{tweet['handle']}: {tweet['text'][:80]}…")

                if not is_baseball_tweet(tweet["text"]):
                    print("    not a baseball tweet, skipping")
                    replied.add(tid)
                    continue

                player_name = extract_player(tweet["text"])
                if not player_name:
                    print("    no player found, skipping")
                    replied.add(tid)
                    continue

                player_id = find_player_id(player_name)
                if not player_id:
                    print(f"    '{player_name}' not in player list, skipping")
                    replied.add(tid)
                    continue

                print(f"    player: {player_name} (ID {player_id})")

                season = detect_season(tweet["text"])
                print(f"    season: {season}")

                import random
                viz_type = random.choice(VIZ_TYPES)
                image_bytes = fetch_viz_image(player_id, viz_type, season)
                if not image_bytes:
                    print("    image fetch failed, skipping")
                    continue

                caption_pool = VIZ_CAPTIONS.get(viz_type, CAPTIONS)
                caption = random.choice(caption_pool).format(
                    name=player_name, season=season, link=HEATER_SIGNUP
                )
                print(f"    viz: {viz_type} | caption: {caption}")

                success = reply_with_image(page, tweet["link"], caption, image_bytes)
                replied.add(tid)
                save_replied(replied)

                if success:
                    print("    replied!")
                    replies_this_cycle += 1
                    time.sleep(15)

        # ── Phase 1: target accounts ──────────────────────────────────────
        for handle in TARGET_ACCOUNTS:
            if replies_this_cycle >= MAX_REPLIES_PER_CYCLE:
                break
            print(f"\n[account] @{handle}")
            tweets = scrape_profile_tweets(page, handle)
            print(f"  found {len(tweets)} tweets")
            process_tweets(tweets, handle)

        # ── Phase 2: keyword search fallback ─────────────────────────────
        for query in SEARCH_QUERIES:
            if replies_this_cycle >= MAX_REPLIES_PER_CYCLE:
                break
            print(f"\n[search] '{query}'")
            tweets = search_tweets(page, query)
            print(f"  found {len(tweets)} tweets")
            process_tweets(tweets, "search")

      finally:
          context.close()

    print(f"\n[cycle done] {replies_this_cycle} replies sent")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--headless", action="store_true", help="Run without browser window")
    parser.add_argument("--loop", type=int, default=0, metavar="MINUTES",
                        help="Repeat every N minutes (0 = run once)")
    args = parser.parse_args()

    print("Heater Twitter Bot starting…")
    print(f"  account : @{TWITTER_USERNAME}")
    print(f"  heater  : {HEATER_BASE_URL}")
    print(f"  headless: {args.headless}")

    run_cycle(args.headless)
    if args.loop > 0:
        while True:
            print(f"\nSleeping {args.loop} minutes…")
            time.sleep(args.loop * 60)
            run_cycle(args.headless)


if __name__ == "__main__":
    main()
