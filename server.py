#!/usr/bin/env python3
import json
import os
import smtplib
import sqlite3
from datetime import date, datetime, timedelta
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "bookings.db"
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8080"))
OPEN_HOUR = 8
CLOSE_HOUR = 18
SLOT_MINUTES = 60


def db():
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS bookings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          booking_code TEXT NOT NULL UNIQUE,
          appointment_at TEXT NOT NULL UNIQUE,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          car_make TEXT NOT NULL,
          car_model TEXT NOT NULL,
          car_year TEXT NOT NULL,
          plate TEXT,
          service TEXT NOT NULL,
          note TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    return connection


def valid_slots(day):
    try:
        selected = date.fromisoformat(day)
    except ValueError:
        return []
    today = date.today()
    if selected < today or selected > today + timedelta(days=60) or selected.weekday() == 6:
        return []
    start = datetime.combine(selected, datetime.min.time()).replace(hour=OPEN_HOUR)
    return [(start + timedelta(minutes=SLOT_MINUTES * i)).isoformat(timespec="minutes")
            for i in range((CLOSE_HOUR - OPEN_HOUR) * 60 // SLOT_MINUTES)]


def send_confirmation(booking):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL", smtp_user or "")
    if not all([smtp_host, smtp_user, smtp_password, from_email]):
        return False
    msg = EmailMessage()
    msg["Subject"] = f"Підтвердження запису — {booking['booking_code']}"
    msg["From"] = from_email
    msg["To"] = booking["email"]
    when = datetime.fromisoformat(booking["appointment_at"]).strftime("%d.%m.%Y о %H:%M")
    msg.set_content(
        f"Вітаємо, {booking['first_name']}!\n\nВаш запис підтверджено.\n"
        f"Дата і час: {when}\nПослуга: {booking['service']}\n"
        f"Авто: {booking['car_make']} {booking['car_model']} ({booking['car_year']})\n"
        f"Код запису: {booking['booking_code']}\n\nДо зустрічі!"
    )
    with smtplib.SMTP_SSL(smtp_host, int(os.getenv("SMTP_PORT", "465"))) as smtp:
        smtp.login(smtp_user, smtp_password)
        smtp.send_message(msg)
    return True


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean = urlparse(path).path.lstrip("/") or "index.html"
        return str(ROOT / clean)

    def json_response(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/slots/"):
            day = parsed.path.rsplit("/", 1)[-1]
            slots = valid_slots(day)
            with db() as conn:
                taken = {row["appointment_at"] for row in conn.execute(
                    "SELECT appointment_at FROM bookings WHERE appointment_at LIKE ?", (f"{day}%",)
                )}
            self.json_response(200, {"date": day, "slots": [
                {"value": slot, "time": slot[-5:], "available": slot not in taken} for slot in slots
            ]})
            return
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/bookings":
            self.json_response(404, {"error": "Не знайдено"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            data = json.loads(self.rfile.read(length))
        except (ValueError, json.JSONDecodeError):
            self.json_response(400, {"error": "Некоректні дані"})
            return
        required = ["first_name", "last_name", "email", "phone", "car_make", "car_model",
                    "car_year", "service", "appointment_at"]
        if any(not str(data.get(key, "")).strip() for key in required):
            self.json_response(400, {"error": "Заповніть усі обов’язкові поля"})
            return
        appointment = str(data["appointment_at"])
        if appointment not in valid_slots(appointment[:10]):
            self.json_response(400, {"error": "Оберіть доступний час"})
            return
        code = "TS-" + datetime.now().strftime("%y%m%d%H%M%S%f")[-12:].upper()
        booking = {key: str(data.get(key, "")).strip() for key in required + ["plate", "note"]}
        booking["booking_code"] = code
        try:
            with db() as conn:
                conn.execute(
                    """INSERT INTO bookings
                    (booking_code, appointment_at, first_name, last_name, email, phone, car_make,
                     car_model, car_year, plate, service, note)
                    VALUES (:booking_code, :appointment_at, :first_name, :last_name, :email, :phone,
                            :car_make, :car_model, :car_year, :plate, :service, :note)""", booking
                )
        except sqlite3.IntegrityError:
            self.json_response(409, {"error": "Цей час щойно зайняли. Оберіть інший."})
            return
        emailed = False
        try:
            emailed = send_confirmation(booking)
        except Exception as exc:
            print(f"Email error: {exc}")
        self.json_response(201, {"ok": True, "booking_code": code, "email_sent": emailed})

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")


if __name__ == "__main__":
    with db():
        pass
    print(f"TorqueLab Service: http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
