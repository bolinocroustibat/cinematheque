"""
Reset the database: drop all tables then re-run migrations from scratch.
Result is an empty database with schema at initial migration state.

Run from the backend directory:
    uv run manage.py reset_db

Use --no-input to skip the confirmation prompt.
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Drop all tables and re-run migrations (empty DB, fresh schema)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-input",
            action="store_true",
            help="Skip confirmation prompt",
        )

    def handle(self, *args, **options):
        if not options["no_input"]:
            self.stdout.write(
                self.style.WARNING(
                    "This will DROP ALL TABLES and delete all data. "
                    "Migrations will be re-applied from scratch."
                )
            )
            if input("Are you sure? Type 'yes' to continue: ") != "yes":
                self.stdout.write(self.style.NOTICE("Aborted."))
                return

        with connection.cursor() as cursor:
            vendor = connection.vendor
            if vendor == "postgresql":
                # Drop all tables in public schema (and the migration history)
                cursor.execute(
                    """
                    DO $$
                    DECLARE
                        r RECORD;
                    BEGIN
                        FOR r IN (
                            SELECT tablename
                            FROM pg_tables
                            WHERE schemaname = 'public'
                        ) LOOP
                            EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
                        END LOOP;
                    END $$;
                    """
                )
            elif vendor == "sqlite":
                cursor.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                )
                tables = [row[0] for row in cursor.fetchall()]
                for table in tables:
                    cursor.execute(f'DROP TABLE IF EXISTS "{table}"')
            else:
                self.stdout.write(
                    self.style.ERROR(f"Unsupported database vendor: {vendor}")
                )
                return

        self.stdout.write(self.style.SUCCESS("All tables dropped."))
        self.stdout.write("Re-applying migrations...")
        call_command("migrate", verbosity=1)
        self.stdout.write(self.style.SUCCESS("Database reset complete."))
