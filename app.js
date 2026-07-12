const $ = selector => document.querySelector(selector);
const form = $('#booking-form');
const dateInput = $('#date');
const serviceInput = $('#service');
const slotsEl = $('#slots');
const appointmentInput = form.elements.appointment_at;
const message = $('#form-message');
const isStaticDemo = location.hostname.endsWith('github.io');
const EMAIL_ENDPOINT = 'https://formsubmit.co/ajax/vladpadsk@gmail.com';
const STORAGE_KEY = 'torquelab_bookings_v2';

const translations = {
  uk: {
    nav_services:'Послуги',nav_process:'Як це працює',nav_contacts:'Контакти',book_now:'Записатися',open_hours:'Працюємо Пн–Сб · 08:00–18:00',hero_title:'Ваше авто.<br><em>Наша турбота.</em>',hero_text:'Професійний сервіс без зайвих слів. Чесна діагностика, прозора ціна й онлайн-запис за дві хвилини.',choose_time:'Обрати вільний час →',what_we_do:'ЩО МИ РОБИМО',services_title:'Все, що потрібно вашому авто',services_text:'Від планового обслуговування до складного ремонту — в одному надійному місці.',diagnostics:'Діагностика',diagnostics_text:'Комп’ютерна та комплексна перевірка всіх систем.',maintenance:'Планове ТО',maintenance_text:'Мастило, фільтри та контроль ключових вузлів.',brakes:'Гальмівна система',brakes_text:'Діагностика, заміна колодок, дисків і рідини.',suspension:'Ходова частина',suspension_text:'Підвіска, амортизатори, кермове управління.',from_25:'від €25',from_60:'від €60',from_45:'від €45',from_50:'від €50',simple:'ПРОСТО Й ЗРОЗУМІЛО',process_title:'Від запису до готового авто',online_booking:'ОНЛАЙН-ЗАПИС',booking_title:'Знайдемо час для вашого авто',booking_text:'Спочатку оберіть послугу, потім дату — система покаже лише години, достатні для виконання обраної роботи.',no_calls:'Без дзвінків та очікування',instant_confirm:'Підтвердження одразу після запису',benefit_slots:'Розумний підбір часу',benefit_lock:'Зайняті терміни блокуються',benefit_email:'Дані надходять на email',service_question:'Що потрібно зробити?',free_time:'Вільний час',select_service_date:'Спочатку оберіть послугу та дату',available:'Доступно',busy:'Зайнято',your_booking:'ВАШ ЗАПИС',summary_service:'Послуга',summary_time:'Дата і час',summary_duration:'Тривалість',consent:'Погоджуюся на обробку персональних даних для організації запису.',confirm_booking:'Підтвердити запис →',rating:'★ рейтинг клієнтів',experience:'років досвіду',warranty_value:'12 міс.',warranty:'гарантії на роботи',no_compromise:'СЕРВІС БЕЗ КОМПРОМІСІВ',precision:'Точність у кожній деталі',nearest_slot:'НАЙБЛИЖЧИЙ ВІЛЬНИЙ ЧАС',loading_short:'Завантаження…',step1_title:'Оберіть час',step1_text:'Вкажіть послугу, авто та зручний вільний термін.',step2_title:'Отримайте підтвердження',step2_text:'Система забронює час і надішле всі деталі на email.',step3_title:'Приїжджайте до нас',step3_text:'Майстер уже знатиме про ваше авто та запит.',contact_data:'Ваші контактні дані',confirm_hint:'Щоб підтвердити запис',first_name:'Ім’я',last_name:'Прізвище',phone:'Телефон',first_name_ph:'Ваше ім’я',last_name_ph:'Ваше прізвище',car_info:'Інформація про авто',mechanic_hint:'Допоможе підготуватися майстру',make:'Марка',model:'Модель',year:'Рік',plate:'Номерний знак',optional:'(необов’язково)',service_time:'Послуга та час',choose_convenient:'Оберіть зручний термін',preferred_date:'Бажана дата',comment:'Коментар',comment_ph:'Опишіть проблему або побажання…',footer_text:'Сучасний автосервіс, якому довіряють.',schedule:'Графік',schedule_text:'Пн–Пт: 08:00–18:00<br>Субота: 08:00–16:00<br>Неділя: зачинено',address:'Адреса',address_text:'Братислава, Словаччина<br>Точну адресу додамо пізніше',copyright:'© 2026 TorqueLab Service · Демонстраційний сайт',success_title:'Запис підтверджено!',success_text:'Ваш час заброньовано. Збережіть код запису:',done:'Готово',page_title:'TorqueLab Service — автосервіс нового покоління',page_description:'TorqueLab Service — сучасний автосервіс та онлайн-запис без дзвінків.',morning:'РАНОК',afternoon:'ПІСЛЯ ОБІДУ',select_service:'Спочатку оберіть послугу.',select_date:'Оберіть дату.',closed:'Цього дня сервіс не працює. Оберіть іншу дату.',no_slots:'На цю дату немає достатньо довгого вільного терміну.',loading:'Перевіряємо вільний час…',minutes:'хв',hour:'год',hours:'год',booking_error:'Не вдалося створити запис',choose_slot:'Оберіть вільний час.',sending:'Бронюємо…',email_sent:'Дані запису відправлено на email автосервісу.'
  },
  sk: {
    nav_services:'Služby',nav_process:'Ako to funguje',nav_contacts:'Kontakty',book_now:'Objednať sa',open_hours:'Otvorené Po–So · 08:00–18:00',hero_title:'Vaše auto.<br><em>Naša starostlivosť.</em>',hero_text:'Profesionálny servis bez zbytočných slov. Férová diagnostika, transparentná cena a online rezervácia za dve minúty.',choose_time:'Vybrať voľný termín →',what_we_do:'ČO ROBÍME',services_title:'Všetko, čo vaše auto potrebuje',services_text:'Od pravidelnej údržby až po náročné opravy — na jednom spoľahlivom mieste.',diagnostics:'Diagnostika',diagnostics_text:'Počítačová a komplexná kontrola všetkých systémov.',maintenance:'Pravidelný servis',maintenance_text:'Olej, filtre a kontrola kľúčových komponentov.',brakes:'Brzdový systém',brakes_text:'Diagnostika, výmena platničiek, kotúčov a kvapaliny.',suspension:'Podvozok',suspension_text:'Nápravy, tlmiče a riadenie.',from_25:'od €25',from_60:'od €60',from_45:'od €45',from_50:'od €50',simple:'JEDNODUCHO A JASNE',process_title:'Od rezervácie po hotové auto',online_booking:'ONLINE REZERVÁCIA',booking_title:'Nájdeme termín pre vaše auto',booking_text:'Najprv vyberte službu a potom dátum — systém zobrazí iba termíny s dostatočnou dĺžkou na zvolenú prácu.',no_calls:'Bez telefonovania a čakania',instant_confirm:'Potvrdenie ihneď po rezervácii',benefit_slots:'Inteligentný výber termínu',benefit_lock:'Obsadené termíny sú zablokované',benefit_email:'Údaje prídu emailom',service_question:'Čo potrebujete urobiť?',free_time:'Voľný čas',select_service_date:'Najprv vyberte službu a dátum',available:'Voľné',busy:'Obsadené',your_booking:'VAŠA REZERVÁCIA',summary_service:'Služba',summary_time:'Dátum a čas',summary_duration:'Trvanie',consent:'Súhlasím so spracovaním osobných údajov na účely rezervácie.',confirm_booking:'Potvrdiť rezerváciu →',rating:'★ hodnotenie zákazníkov',experience:'rokov skúseností',warranty_value:'12 mes.',warranty:'záruka na vykonané práce',no_compromise:'SERVIS BEZ KOMPROMISOV',precision:'Presnosť v každom detaile',nearest_slot:'NAJBLIŽŠÍ VOĽNÝ TERMÍN',loading_short:'Načítava sa…',step1_title:'Vyberte termín',step1_text:'Zadajte službu, vozidlo a vhodný voľný termín.',step2_title:'Dostanete potvrdenie',step2_text:'Systém rezervuje termín a pošle všetky údaje emailom.',step3_title:'Príďte k nám',step3_text:'Mechanik už bude poznať vaše vozidlo aj požiadavku.',contact_data:'Vaše kontaktné údaje',confirm_hint:'Na potvrdenie rezervácie',first_name:'Meno',last_name:'Priezvisko',phone:'Telefón',first_name_ph:'Vaše meno',last_name_ph:'Vaše priezvisko',car_info:'Informácie o vozidle',mechanic_hint:'Pomôžu mechanikovi pripraviť sa',make:'Značka',model:'Model',year:'Rok',plate:'Evidenčné číslo',optional:'(nepovinné)',service_time:'Služba a termín',choose_convenient:'Vyberte si vhodný termín',preferred_date:'Požadovaný dátum',comment:'Poznámka',comment_ph:'Opíšte problém alebo svoje požiadavky…',footer_text:'Moderný autoservis, ktorému môžete dôverovať.',schedule:'Otváracie hodiny',schedule_text:'Po–Pi: 08:00–18:00<br>Sobota: 08:00–16:00<br>Nedeľa: zatvorené',address:'Adresa',address_text:'Bratislava, Slovensko<br>Presnú adresu doplníme neskôr',copyright:'© 2026 TorqueLab Service · Ukážková webová stránka',success_title:'Rezervácia je potvrdená!',success_text:'Váš termín je rezervovaný. Uložte si kód rezervácie:',done:'Hotovo',page_title:'TorqueLab Service — autoservis novej generácie',page_description:'TorqueLab Service — moderný autoservis a online rezervácia bez telefonovania.',morning:'DOOBEDA',afternoon:'POOBEDE',select_service:'Najprv vyberte službu.',select_date:'Vyberte dátum.',closed:'V tento deň je servis zatvorený. Vyberte iný dátum.',no_slots:'Na tento dátum nie je dostatočne dlhý voľný termín.',loading:'Kontrolujeme voľné termíny…',minutes:'min',hour:'hod',hours:'hod',booking_error:'Rezerváciu sa nepodarilo vytvoriť',choose_slot:'Vyberte voľný termín.',sending:'Rezervujeme…',email_sent:'Údaje rezervácie boli odoslané na email servisu.'
  }
};

let lang = localStorage.getItem('torquelab_lang') || 'uk';
const t = key => translations[lang][key] || key;
const serviceLabels = {
  uk:{diagnostics:'Комп’ютерна діагностика',maintenance:'Планове ТО',brakes:'Гальмівна система',suspension:'Ходова частина',tires:'Шиномонтаж',other:'Інше / консультація'},
  sk:{diagnostics:'Počítačová diagnostika',maintenance:'Pravidelný servis',brakes:'Brzdový systém',suspension:'Podvozok',tires:'Pneuservis',other:'Iné / konzultácia'}
};

function durationText(minutes) {
  if (minutes < 60) return `${minutes} ${t('minutes')}`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return `${hours} ${hours === 1 ? t('hour') : t('hours')}${rest ? ` ${rest} ${t('minutes')}` : ''}`;
}

function setLanguage(next) {
  lang = next; localStorage.setItem('torquelab_lang', lang); document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-html]').forEach(el => el.innerHTML = t(el.dataset.i18nHtml));
  document.querySelectorAll('[data-placeholder]').forEach(el => el.placeholder = t(el.dataset.placeholder));
  document.querySelectorAll('[data-lang]').forEach(el => el.classList.toggle('active', el.dataset.lang === lang));
  document.title = t('page_title');
  document.querySelector('meta[name="description"]').content = t('page_description');
  document.querySelector('.language').setAttribute('aria-label', lang === 'uk' ? 'Вибір мови' : 'Výber jazyka');
  document.querySelector('.logo').setAttribute('aria-label', lang === 'uk' ? 'TorqueLab — на головну' : 'TorqueLab — domov');
  const first = serviceInput.options[0]; first.textContent = lang === 'uk' ? 'Оберіть послугу' : 'Vyberte službu';
  [...serviceInput.options].slice(1).forEach(option => option.textContent = `${serviceLabels[lang][option.value]} · ${durationText(+option.dataset.duration)}`);
  updateSummary();
  if (dateInput.value && serviceInput.value) loadSlots(dateInput.value);
  findNextSlot();
}
document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));

const today = new Date();
const iso = d => d.toLocaleDateString('en-CA');
dateInput.min = iso(today);
const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 60); dateInput.max = iso(maxDate);
const savedBookings = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

function updateSummary() {
  const option = serviceInput.selectedOptions[0];
  $('#summary-service').textContent = serviceInput.value ? serviceLabels[lang][serviceInput.value] : '—';
  $('#summary-duration').textContent = serviceInput.value ? durationText(+option.dataset.duration) : '—';
  if (appointmentInput.value) {
    const d = new Date(appointmentInput.value);
    $('#summary-time').textContent = d.toLocaleString(lang === 'uk' ? 'uk-UA' : 'sk-SK', {weekday:'short',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
  } else $('#summary-time').textContent = '—';
}

function buildDemoSlots(day, duration) {
  const selected = new Date(`${day}T12:00:00`);
  const weekday = selected.getDay();
  if (weekday === 0) return [];
  const closing = weekday === 6 ? 16 : 18;
  const taken = savedBookings();
  const now = new Date();
  const result = [];
  for (let hour = 8; hour < closing; hour++) {
    for (const minute of [0,30]) {
      const start = new Date(`${day}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`);
      const end = new Date(start.getTime() + duration * 60000);
      const overlap = taken.some(item => start < new Date(item.end) && end > new Date(item.start));
      const available = end.getHours() + end.getMinutes()/60 <= closing && start.getTime() > now.getTime() + 2*3600000 && !overlap;
      result.push({value:start.toISOString().slice(0,16),time:start.toTimeString().slice(0,5),available});
    }
  }
  return result;
}

function renderSlots(slots) {
  if (!slots.length) { slotsEl.innerHTML = `<p>${t('closed')}</p>`; return; }
  const availableCount = slots.filter(s => s.available).length;
  if (!availableCount) { slotsEl.innerHTML = `<p>${t('no_slots')}</p>`; return; }
  let lastGroup = '';
  slotsEl.innerHTML = slots.map(slot => {
    const group = +slot.time.slice(0,2) < 12 ? t('morning') : t('afternoon');
    const heading = group !== lastGroup ? `<div class="slot-group">${group}</div>` : '';
    lastGroup = group;
    return `${heading}<button type="button" data-value="${slot.value}" ${slot.available ? '' : 'disabled'}>${slot.time}</button>`;
  }).join('');
  slotsEl.querySelectorAll('button:not(:disabled)').forEach(button => button.addEventListener('click', () => {
    slotsEl.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
    button.classList.add('selected'); appointmentInput.value = button.dataset.value; updateSummary();
  }));
}

async function loadSlots(day) {
  appointmentInput.value = ''; updateSummary();
  if (!serviceInput.value) { slotsEl.innerHTML = `<p>${t('select_service')}</p>`; return; }
  slotsEl.innerHTML = `<p>${t('loading')}</p>`;
  const duration = +serviceInput.selectedOptions[0].dataset.duration;
  if (isStaticDemo) { renderSlots(buildDemoSlots(day, duration)); return; }
  try {
    const data = await fetch(`/api/slots/${day}?duration=${duration}`).then(r => r.json()); renderSlots(data.slots);
  } catch { renderSlots(buildDemoSlots(day, duration)); }
}

dateInput.addEventListener('change', () => dateInput.value ? loadSlots(dateInput.value) : null);
serviceInput.addEventListener('change', () => { updateSummary(); if (dateInput.value) loadSlots(dateInput.value); else slotsEl.innerHTML=`<p>${t('select_date')}</p>`; });

async function findNextSlot() {
  for (let i=0;i<14;i++) {
    const d=new Date(); d.setDate(d.getDate()+i);
    const free=buildDemoSlots(iso(d),60).find(slot=>slot.available);
    if (free) { $('#next-slot').textContent=`${d.toLocaleDateString(lang==='uk'?'uk-UA':'sk-SK',{day:'numeric',month:'long'})}, ${free.time}`; return; }
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault(); message.textContent='';
  if (!form.reportValidity()) return;
  if (!appointmentInput.value) { message.textContent=t('choose_slot'); return; }
  const submit=form.querySelector('.submit'), original=t('confirm_booking'); submit.disabled=true; submit.textContent=t('sending');
  const payload=Object.fromEntries(new FormData(form).entries());
  const duration=+serviceInput.selectedOptions[0].dataset.duration;
  try {
    const emailPayload={_subject:`Новий запис на автосервіс — ${payload.appointment_at}`,_template:'table',_url:location.href,'Ім’я':payload.first_name,'Прізвище':payload.last_name,'Email клієнта':payload.email,'Телефон':payload.phone,'Марка авто':payload.car_make,'Модель авто':payload.car_model,'Рік випуску':payload.car_year,'Номерний знак':payload.plate||'Не вказано','Потрібні роботи':serviceLabels[lang][payload.service],'Тривалість':durationText(duration),'Дата і час':payload.appointment_at.replace('T',' '),'Коментар клієнта':payload.note||'Немає'};
    const endpoint=isStaticDemo?EMAIL_ENDPOINT:'/api/bookings';
    const body=isStaticDemo?emailPayload:{...payload,service:serviceLabels[lang][payload.service],duration};
    const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body)});
    const data=await res.json(); if(!res.ok) throw new Error(data.error||t('booking_error'));
    if(isStaticDemo){const bookings=savedBookings();const start=new Date(payload.appointment_at);bookings.push({start:payload.appointment_at,end:new Date(start.getTime()+duration*60000).toISOString().slice(0,16)});localStorage.setItem(STORAGE_KEY,JSON.stringify(bookings));}
    $('#booking-code').textContent=data.booking_code||`TS-${Date.now().toString().slice(-8)}`;
    $('#email-status').textContent=t('email_sent'); $('#success').classList.add('open'); $('#success').setAttribute('aria-hidden','false');
    form.reset(); appointmentInput.value=''; slotsEl.innerHTML=`<p>${t('select_service_date')}</p>`; updateSummary(); findNextSlot();
  } catch(err){message.textContent=err.message;if(dateInput.value)loadSlots(dateInput.value)} finally{submit.disabled=false;submit.textContent=original;}
});

$('#close-modal').addEventListener('click',()=>{$('#success').classList.remove('open');$('#success').setAttribute('aria-hidden','true')});
setLanguage(lang); findNextSlot();
