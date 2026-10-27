"""Run Django commands using the ignored Supabase configuration, never printing it.

Examples: python scripts/supabase_manage.py check
          python scripts/supabase_manage.py migrate_schemas --shared --noinput
          python scripts/supabase_manage.py bootstrap_staywired
"""
import os
import sys
from pathlib import Path
from decouple import RepositoryEnv

root = Path(__file__).resolve().parents[1]
source = root / ".env.supabase.local"
if not source.exists():
    raise SystemExit("Create backend/.env.supabase.local first (it is ignored by Git).")
values = RepositoryEnv(str(source))
if not values.data.get("POSTGRES_PASSWORD", "").strip():
    raise SystemExit("POSTGRES_PASSWORD is blank in the ignored local configuration.")
expected = "postgres.vwrwuywyadbjugyttbgb"
if values.data.get("POSTGRES_USER") != expected:
    raise SystemExit("Refusing to connect: the configured database user does not match the verified project.")
for key, value in values.data.items():
    os.environ[key] = value
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.vercel")
os.chdir(root)
sys.path.insert(0, str(root))
from django.core.management import execute_from_command_line
execute_from_command_line(["manage.py", *sys.argv[1:]])
