# Using a separate SQLite .db file

This project uses SQLite for server-side storage. By default the database file is `server/coaching-center.db`.

You can override the database file path using the `DATABASE_FILE` environment variable. Example:

Windows (PowerShell):

```
$env:DATABASE_FILE = 'C:\path\to\your\my-db.db'; node server.js
```

Or run the server with an inline environment variable (PowerShell):

```
cmd /C "set DATABASE_FILE=server\my-db.db && node server\server.js"
```

Migration helper:

A small script `server/migrate_db.js` is provided to copy the current DB file to a new location.

Usage:

```
node server/migrate_db.js path\to\target.db
```

Notes:
- The migration script performs a file copy. If you want a schema-only migration or more advanced transforms, use `sqlite3` CLI or a dedicated migration tool.
- If the source DB doesn't exist yet, start the server once so it creates the default DB, then re-run the migration.
