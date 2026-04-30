"""
Scheduler — wires the SEO pipeline to automated cron tasks.

Designed to run via cron or a process manager (e.g. launchd on macOS, systemd on Linux).

Cron schedule:
  - 1st of month: python scheduler.py monthly-setup
  - Daily at 07:00: python scheduler.py daily-article
  - 15th of month: python scheduler.py backlinks
  - Anytime: python scheduler.py status
"""
import json
import subprocess
import sys
import pathlib
from datetime import date

BASE_DIR = pathlib.Path(__file__).parent
LOG_FILE = BASE_DIR / "output" / "pipeline.log"


def log(msg: str):
    ts = date.today().isoformat()
    line = f"[{ts}] {msg}"
    print(line)
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def run_pipeline(cmd: str):
    log(f"Starting: {cmd}")
    try:
        result = subprocess.run(
            [sys.executable, str(BASE_DIR / "pipeline.py"), cmd],
            capture_output=False,
            text=True,
        )
        log(f"Finished: {cmd} (exit {result.returncode})")
    except Exception as e:
        log(f"ERROR running {cmd}: {e}")


CRON_INSTRUCTIONS = """
# ── Cron setup instructions ──────────────────────────────────────────
# Add to crontab (crontab -e):
#
# Run monthly setup on the 1st at 6:00 AM
# 0 6 1 * * cd /path/to/EASA_app/seo_agent && python scheduler.py monthly-setup
#
# Write one article per day at 7:00 AM (gives you 30/month)
# 0 7 * * * cd /path/to/EASA_app/seo_agent && python scheduler.py daily-article
#
# Find backlinks on the 15th at 8:00 AM
# 0 8 15 * * cd /path/to/EASA_app/seo_agent && python scheduler.py backlinks
#
# Or use: python scheduler.py print-crontab
# to print these lines ready to paste.
"""


def print_crontab():
    script = BASE_DIR.absolute()
    py = sys.executable
    print(f"# Add these lines to your crontab (crontab -e):\n")
    print(f"0 6 1 * *  cd {script} && {py} scheduler.py monthly-setup  >> {LOG_FILE} 2>&1")
    print(f"0 7 * * *  cd {script} && {py} scheduler.py daily-article  >> {LOG_FILE} 2>&1")
    print(f"0 8 15 * * cd {script} && {py} scheduler.py backlinks      >> {LOG_FILE} 2>&1")


# ── Commands ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "help"

    if cmd == "monthly-setup":
        run_pipeline("setup")

    elif cmd == "daily-article":
        run_pipeline("daily")

    elif cmd == "backlinks":
        run_pipeline("backlinks")

    elif cmd == "status":
        run_pipeline("status")

    elif cmd == "print-crontab":
        print_crontab()

    else:
        print(CRON_INSTRUCTIONS)
        print_crontab()
