#!/usr/bin/env python3
import json
import os
import re
import smtplib
import sqlite3
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "bookings.db"
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8080"))
OPEN_HOUR = 8
CLOSE_HOUR = 18
SLOT_MINUTES = 30
MAX_BODY_BYTES = 64 * 1024
PUBLIC_FILES = {"index.html", "styles.css", "enhancements.css", "app.js"}
SERVICE_DETAILS = {
    "diagnostics": ("Комп’ютерна діагностика", 60),
    "maintenance": ("Планове ТО", 90),
    "brakes": ("Гальмівна система", 120),
    "suspension": ("Ходова частина", 120),
    "tires": ("Шиномонтаж", 60),
    "other": ("Інше / консультація", 60),
}
FIELD_LIMITS = {
    "first_name": 80, "last_name": 80, "email": 254, "phone": 40,
    "car_make": 80, "car_model": 80, "car_year": 4, "plate": 24, "note": 1000,
}


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
          duration INTEGER NOT NULL DEFAULT 60,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    columns = {row[1] for row in connection.execute("PRAGMA table_info(bookings)")}
    if "duration" not in columns:
        connection.execute("ALTER TABLE bookings ADD COLUMN duration INTEGER NOT NULL DEFAULT 60")
    connection.commit()
    return connection


def valid_slots(day, duration=60):
    try:
        selected = date.fromisoformat(day)
    except ValueError:
        return []
    today = date.today()
    if selected < today or selected > today + timedelta(days=60) or selected.weekday() == 6:
        return []
    duration = max(30, min(240, int(duration)))
    close_hour = 16 if selected.weekday() == 5 else CLOSE_HOUR
    start = datetime.combine(selected, datetime.min.time()).replace(hour=OPEN_HOUR)
    now_limit = datetime.now() + timedelta(hours=2)
    slots = []
    for i in range((close_hour - OPEN_HOUR) * 60 // SLOT_MINUTES):
        slot = start + timedelta(minutes=SLOT_MINUTES * i)
        if slot > now_limit and slot + timedelta(minutes=duration) <= start.replace(hour=close_hour):
            slots.append(slot.isoformat(timespec="minutes"))
    return slots


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


def send_telegram(booking):
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_ADMIN_CHAT_ID")
    if not token or not chat_id:
        return False
    when = datetime.fromisoformat(booking["appointment_at"]).strftime("%d.%m.%Y о %H:%M")
    text = (
        "🚗 НОВИЙ ЗАПИС НА СЕРВІС\n\n"
        f"👤 {booking['first_name']} {booking['last_name']}\n"
        f"📞 {booking['phone']}\n✉️ {booking['email']}\n\n"
        f"🚘 {booking['car_make']} {booking['car_model']} ({booking['car_year']})\n"
        f"🔢 Номер: {booking.get('plate') or 'не вказано'}\n\n"
        f"🔧 Роботи: {booking['service']}\n"
        f"📅 Термін: {when}\n⏱ Тривалість: {booking['duration']} хв\n"
        f"📝 Коментар: {booking.get('note') or 'немає'}\n\n"
        f"Код: {booking['booking_code']}"
    )
    payload = urllib.parse.urlencode({"chat_id": chat_id, "text": text}).encode()
    with urllib.request.urlopen(urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage", data=payload), timeout=15) as response:
        return json.load(response).get("ok", False)


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean = urllib.parse.unquote(urlparse(path).path).lstrip("/") or "index.html"
        return str(ROOT / clean) if clean in PUBLIC_FILES else str(ROOT / "__not_found__")

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; style-src 'self' https://fonts.googleapis.com; "
            "font-src https://fonts.gstatic.com; connect-src 'self' https://formsubmit.co; "
            "img-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
        )
        super().end_headers()

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
            try:
                duration = int(parse_qs(parsed.query).get("duration", ["60"])[0])
            except ValueError:
                duration = 60
            slots = valid_slots(day, duration)
            with db() as conn:
                bookings = list(conn.execute("SELECT appointment_at, duration FROM bookings WHERE appointment_at LIKE ?", (f"{day}%",)))
            def available(slot):
                start = datetime.fromisoformat(slot)
                end = start + timedelta(minutes=duration)
                return not any(start < datetime.fromisoformat(row["appointment_at"]) + timedelta(minutes=row["duration"]) and end > datetime.fromisoformat(row["appointment_at"]) for row in bookings)
            self.json_response(200, {"date": day, "slots": [
                {"value": slot, "time": slot[-5:], "available": available(slot)} for slot in slots
            ]})
            return
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/bookings":
            self.json_response(404, {"error": "Не знайдено"})
            return
        if not self.headers.get("Content-Type", "").lower().startswith("application/json"):
            self.json_response(415, {"error": "Очікується JSON-запит"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY_BYTES:
                self.json_response(413, {"error": "Запит завеликий або порожній"})
                return
            data = json.loads(self.rfile.read(length))
        except (ValueError, json.JSONDecodeError):
            self.json_response(400, {"error": "Некоректні дані"})
            return
        required = ["first_name", "last_name", "email", "phone", "car_make", "car_model",
                    "car_year", "service", "appointment_at"]
        if any(not str(data.get(key, "")).strip() for key in required):
            self.json_response(400, {"error": "Заповніть усі обов’язкові поля"})
            return
        if data.get("consent") != "accepted":
            self.json_response(400, {"error": "Потрібна згода на обробку персональних даних"})
            return
        service_key = str(data["service"]).strip()
        if service_key not in SERVICE_DETAILS:
            self.json_response(400, {"error": "Оберіть послугу зі списку"})
            return
        for key, limit in FIELD_LIMITS.items():
            if len(str(data.get(key, "")).strip()) > limit:
                self.json_response(400, {"error": f"Поле {key} перевищує дозволену довжину"})
                return
        email = str(data["email"]).strip()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            self.json_response(400, {"error": "Вкажіть коректний email"})
            return
        phone = str(data["phone"]).strip()
        if not re.fullmatch(r"[+()\d\s.-]{7,40}", phone) or len(re.sub(r"\D", "", phone)) < 7:
            self.json_response(400, {"error": "Вкажіть коректний телефон"})
            return
        try:
            car_year = int(str(data["car_year"]).strip())
        except ValueError:
            car_year = 0
        if not 1960 <= car_year <= date.today().year + 1:
            self.json_response(400, {"error": "Вкажіть коректний рік авто"})
            return
        appointment = str(data["appointment_at"])
        service_label, duration = SERVICE_DETAILS[service_key]
        if appointment not in valid_slots(appointment[:10], duration):
            self.json_response(400, {"error": "Оберіть доступний час"})
            return
        code = "TS-" + datetime.now().strftime("%y%m%d%H%M%S%f")[-12:].upper()
        booking = {key: str(data.get(key, "")).strip() for key in required + ["plate", "note"]}
        booking["service"] = service_label
        booking["booking_code"] = code
        booking["duration"] = duration
        try:
            with db() as conn:
                conn.execute("BEGIN IMMEDIATE")
                start = datetime.fromisoformat(appointment)
                end = start + timedelta(minutes=duration)
                overlap = conn.execute("SELECT 1 FROM bookings WHERE datetime(appointment_at) < datetime(?) AND datetime(appointment_at, '+' || duration || ' minutes') > datetime(?) LIMIT 1", (end.isoformat(timespec="minutes"), appointment)).fetchone()
                if overlap:
                    self.json_response(409, {"error": "Цей час щойно зайняли. Оберіть інший."})
                    return
                conn.execute(
                    """INSERT INTO bookings
                    (booking_code, appointment_at, first_name, last_name, email, phone, car_make,
                     car_model, car_year, plate, service, note, duration)
                    VALUES (:booking_code, :appointment_at, :first_name, :last_name, :email, :phone,
                            :car_make, :car_model, :car_year, :plate, :service, :note, :duration)""", booking
                )
        except sqlite3.IntegrityError:
            self.json_response(409, {"error": "Цей час щойно зайняли. Оберіть інший."})
            return
        except sqlite3.OperationalError:
            self.json_response(503, {"error": "Сервіс тимчасово зайнятий. Спробуйте ще раз."})
            return
        emailed = False
        telegram_sent = False
        try:
            emailed = send_confirmation(booking)
        except Exception as exc:
            print(f"Email error: {exc}")
        try:
            telegram_sent = send_telegram(booking)
        except Exception as exc:
            print(f"Telegram error: {exc}")
        self.json_response(201, {"ok": True, "booking_code": code, "email_sent": emailed, "telegram_sent": telegram_sent})

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")


if __name__ == "__main__":
    with db():
        pass
    print(f"TorqueLab Service: http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
