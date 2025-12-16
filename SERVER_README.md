Server README

This file explains how to create admin/student records directly in the SQLite DB and how to test the login endpoints.

Database file:
- server/coaching-center.db

Create a new admin (example):
1. Open the DB with sqlite3:
   sqlite3 server/coaching-center.db
2. Run an INSERT (passwords are stored in plaintext in this project):
   INSERT INTO admin (username, password, role) VALUES ('newadmin','newpass','super');
3. Exit and test the login API:
   curl -sS -X POST http://localhost:3001/api/admin/login -H 'Content-Type: application/json' -d '{"username":"newadmin","password":"newpass"}' | jq '.'

Create a new student (example):
1. Open the DB with sqlite3:
   sqlite3 server/coaching-center.db
2. Run an INSERT (adjust fields as needed):
   INSERT INTO students (id, name, class, username, password, phone, email, address, status, createdAt) VALUES (1009, 'Test Student', '10th', 'testuser', 'testpass', '9999999999', 'test@example.com', 'Somewhere', 'Active', '2025-10-04');
3. Exit and test the login API:
   curl -sS -X POST http://localhost:3001/api/students/login -H 'Content-Type: application/json' -d '{"username":"testuser","password":"testpass"}' | jq '.'

Notes:
- This project stores passwords in plaintext for simplicity. For production, migrate to hashed passwords (bcrypt) and update the login endpoints to verify hashed passwords.
- If you use the web UI, the frontend will call the server endpoints; the localStorage fallback is only used when the server is unreachable.
- If you prefer a convenience start script on macOS/Linux use the repository root's run_all.sh script:
   chmod +x run_all.sh
   ./run_all.sh

PowerShell script:
- There is a run_all.ps1 intended for Windows and PowerShell Core. On macOS/Linux, install PowerShell Core (pwsh) to run it, or use run_all.sh instead.
