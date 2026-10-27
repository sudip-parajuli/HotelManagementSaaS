"""Transfer local deployment configuration to Vercel via stdin, never logging values.

Requires an authenticated Vercel CLI. API secrets are production-only; previews
must not silently inherit production database access.
"""
import argparse
import shutil
import subprocess
from pathlib import Path
from decouple import RepositoryEnv

parser = argparse.ArgumentParser()
parser.add_argument("target", choices=["api", "frontend"])
parser.add_argument("--allow-missing-password", action="store_true", help="Prepare the API runtime before database credentials are supplied.")
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
values = RepositoryEnv(str(root / "backend" / ".env.supabase.local")).data
cli = shutil.which("vercel.cmd") or shutil.which("vercel")
if not cli:
    raise SystemExit("Vercel CLI not found. Authenticate it before running this command.")
if args.target == "api":
    keys = ["DJANGO_SECRET_KEY", "STAYWIRED_PROXY_SECRET", "STAYWIRED_CRON_SECRET", "BLOB_READ_WRITE_TOKEN", "POSTGRES_HOST", "POSTGRES_PORT", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_SSLMODE", "POSTGRES_PASSWORD", "ALLOWED_HOSTS", "STAYWIRED_FRONTEND_HOSTS"]
    env = {key: values[key] for key in keys if values.get(key)}
    if not env.get("POSTGRES_PASSWORD") and not args.allow_missing_password:
        raise SystemExit("POSTGRES_PASSWORD is blank; no variables were uploaded.")
    env["DJANGO_SETTINGS_MODULE"] = "config.settings.vercel"
    project = "staywired-api"
    cwd = root / "backend"
else:
    if not values.get("STAYWIRED_PROXY_SECRET"):
        raise SystemExit("STAYWIRED_PROXY_SECRET is missing.")
    env = {"INTERNAL_BACKEND_URL": "https://staywired-api.vercel.app", "STAYWIRED_PROXY_SECRET": values["STAYWIRED_PROXY_SECRET"]}
    project = "staywired"
    cwd = root / "frontend"
scope = "sudip-2000s-projects"
linked = subprocess.run([cli, "link", "--yes", "--project", project, "--scope", scope], cwd=cwd, capture_output=True, text=True)
if linked.returncode:
    raise SystemExit("Could not link the intended Vercel project. Check CLI account access.")
for key, value in env.items():
    result = subprocess.run([cli, "env", "add", key, "production", "--force", "--sensitive", "--yes", "--scope", scope], input=value, cwd=cwd, capture_output=True, text=True)
    if result.returncode:
        raise SystemExit(f"Could not configure {key}; no secret values were logged. Check Vercel permissions.")
    print(f"Configured {project}: {key} (production, value hidden)")
print("Environment transfer complete. Redeploy to apply the configuration.")
