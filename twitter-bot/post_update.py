"""
post_update.py — post a Heater app update tweet manually.

Usage:
    python post_update.py "Added spray charts for all 30 teams. Go check it out."
    python post_update.py --image path/to/screenshot.png "New pitch movement viz just dropped."
    python post_update.py --headless "Heater update: ..."

If no message is provided, prompts interactively.
"""

import argparse
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

load_dotenv()

TWITTER_USERNAME = os.environ["TWITTER_USERNAME"]
PROFILE_DIR = Path(__file__).parent / "chrome_profile"

UPDATE_TEMPLATES = [
    # Use these as inspiration — or just pass your own message directly
    "New on Heater: {update} Check it out at heaterbaseball.app",
    "Heater update: {update} heaterbaseball.app",
    "Just shipped: {update} → heaterbaseball.app",
]


def post_tweet(page, text: str, image_path: str | None) -> bool:
    """Post a standalone tweet, optionally with an image."""
    try:
        page.goto("https://x.com/compose/tweet", timeout=20000)
        page.wait_for_timeout(3000)

        # Find the composer
        composer = page.locator('[data-testid="tweetTextarea_0"]').first
        composer.wait_for(state="visible", timeout=15000)
        composer.click()
        composer.type(text, delay=45)
        page.wait_for_timeout(800)

        # Optionally attach image
        if image_path:
            img = Path(image_path)
            if not img.exists():
                print(f"[warn] image not found: {image_path}")
            else:
                file_input = page.locator('[data-testid="fileInput"]').first
                file_input.set_input_files(str(img))
                page.wait_for_timeout(3000)
                print(f"  image attached: {img.name}")

        # Submit
        page.locator('[data-testid="tweetButton"]').click()
        page.wait_for_timeout(4000)
        print("  tweet posted!")
        return True

    except Exception as e:
        print(f"[error] post failed: {e}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Post a Heater update tweet")
    parser.add_argument("message", nargs="?", help="Tweet text (prompted if omitted)")
    parser.add_argument("--image", metavar="PATH", help="Path to an image to attach")
    parser.add_argument("--headless", action="store_true", help="Run without browser window")
    args = parser.parse_args()

    if not PROFILE_DIR.exists():
        print("No Chrome profile found. Run: python save_session.py")
        sys.exit(1)

    # Get message
    message = args.message
    if not message:
        print("Enter your update tweet (Ctrl+C to cancel):")
        print("(tip: keep it under 280 chars — heaterbaseball.app counts as 23)\n")
        try:
            message = input("> ").strip()
        except KeyboardInterrupt:
            print("\nCancelled.")
            sys.exit(0)

    if not message:
        print("No message provided.")
        sys.exit(1)

    print(f"\nPosting as @{TWITTER_USERNAME}:")
    print(f"  {message}")
    if args.image:
        print(f"  image: {args.image}")
    print()

    with sync_playwright() as pw:
        context = pw.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            headless=args.headless,
            channel="chrome",
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
            ignore_default_args=["--enable-automation"],
        )
        page = context.new_page()
        Stealth().apply_stealth_sync(page)

        # Verify session
        page.goto("https://x.com/home", timeout=20000)
        page.wait_for_timeout(3000)
        if "home" not in page.url:
            print("Session expired — run: python save_session.py")
            context.close()
            sys.exit(1)

        post_tweet(page, message, args.image)
        context.close()


if __name__ == "__main__":
    main()
