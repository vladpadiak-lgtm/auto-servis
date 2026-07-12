const dateInput = document.querySelector('#date');
const slotsEl = document.querySelector('#slots');
const form = document.querySelector('#booking-form');
const appointmentInput = form.elements.appointment_at;
const message = document.querySelector('#form-message');
const today = new Date();
const iso = d => d.toLocaleDateString('en-CA');
dateInput.min = iso(today);
const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 60); dateInput.max = iso(maxDate);

async function loadSlots(day, target = slotsEl) {
  target.innerHTML = '<p>Перевіряємо вільний час…</p>';
  appointmentInput.value = '';
  try {
    const res = await fetch(`/api/slots/${day}`);
    const data = await res.json();
    if (!data.slots.length) {
      target.innerHTML = '<p>Цього дня сервіс не працює. Оберіть іншу дату.</p>';
      return [];
    }
    target.innerHTML = data.slots.map(slot => `<button type="button" data-value="${slot.value}" ${slot.available ? '' : 'disabled'}>${slot.time}</button>`).join('');
    target.querySelectorAll('button:not(:disabled)').forEach(button => button.addEventListener('click', () => {
      target.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
      button.classList.add('selected');
      appointmentInput.value = button.dataset.value;
    }));
    return data.slots;
  } catch {
    target.innerHTML = '<p>Не вдалося завантажити час. Спробуйте ще раз.</p>';
    return [];
  }
}

dateInput.addEventListener('change', () => dateInput.value && loadSlots(dateInput.value));

async function findNextSlot() {
  for (let i = 0; i < 7; i++) {
    const day = new Date(); day.setDate(day.getDate() + i);
    try {
      const data = await fetch(`/api/slots/${iso(day)}`).then(r => r.json());
      const free = data.slots.find(s => s.available);
      if (free) {
        document.querySelector('#next-slot').textContent = `${day.toLocaleDateString('uk-UA', {day:'numeric', month:'long'})}, ${free.time}`;
        return;
      }
    } catch {}
  }
  document.querySelector('#next-slot').textContent = 'Оберіть дату онлайн';
}

form.addEventListener('submit', async event => {
  event.preventDefault(); message.textContent = '';
  if (!form.reportValidity()) return;
  if (!appointmentInput.value) { message.textContent = 'Оберіть вільний час.'; return; }
  const submit = form.querySelector('.submit');
  submit.disabled = true; submit.textContent = 'Бронюємо…';
  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const res = await fetch('/api/bookings', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не вдалося створити запис');
    document.querySelector('#booking-code').textContent = data.booking_code;
    document.querySelector('#email-status').textContent = data.email_sent ? 'Підтвердження надіслано на ваш email.' : 'Email буде активовано після підключення поштової скриньки сервісу.';
    document.querySelector('#success').classList.add('open');
    document.querySelector('#success').setAttribute('aria-hidden', 'false');
    form.reset(); slotsEl.innerHTML = '<p>Спочатку оберіть дату</p>'; findNextSlot();
  } catch (err) {
    message.textContent = err.message;
    if (dateInput.value) loadSlots(dateInput.value);
  } finally { submit.disabled = false; submit.textContent = 'Підтвердити запис →'; }
});

document.querySelector('#close-modal').addEventListener('click', () => {
  document.querySelector('#success').classList.remove('open');
  document.querySelector('#success').setAttribute('aria-hidden', 'true');
});
findNextSlot();
