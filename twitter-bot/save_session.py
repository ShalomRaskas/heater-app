"""
Run this once to log into Twitter manually and save your session.
Uses a persistent Chrome profile so Twitter doesn't detect automation.

Usage:
    python save_session.py
"""

from pathlib import Path
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

PROFILE_DIR = Path(__file__).parent / "chrome_profile"
PROFILE_DIR.mkdir(exist_ok=True)

with sync_playwright() as pw:
    context = pw.chromium.launch_persistent_context(
        user_data_dir=str(PROFILE_DIR),
        headless=False,
        channel="chrome",          # uses your real installed Chrome
        viewport={"width": 1280, "height": 900},
        args=["--disable-blink-features=AutomationControlled"],
        ignore_default_args=["--enable-automation"],
    )
    page = context.new_page()
    Stealth().apply_stealth_sync(page)
    page.goto("https://x.com/login")

    print("Log into Twitter in the browser window.")
    print("Once you're on your home feed, come back here and press Enter.")
    input("Press Enter after you're logged in...")

    context.close()
    print(f"Session saved to {PROFILE_DIR}")
    print("You can now run: python bot.py")
