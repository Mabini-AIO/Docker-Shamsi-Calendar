const monthNames = ["", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const weekDays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
let currentYear;
let currentMonth;
let currentDay;
let selectedDay = null;
let currentMonthEvents = [];

function initializeSetup() {
    setVariablesToToday();
    const monthSelect = document.getElementById('monthSelect');
    monthSelect.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = monthNames[i];
        monthSelect.appendChild(option);
    }
}

function setVariablesToToday() {
    const parts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    const getPart = (type) => parseInt(parts.find(p => p.type === type).value.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    currentYear = getPart('year');
    currentMonth = getPart('month');
    currentDay = getPart('day');
}

function updateTime() {
    const now = new Date();
    document.getElementById('liveTime').textContent = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
}

function getDaysInMonth(year, month) {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    const isLeap = (((((year - 474) % 2820) + 474) * 682) % 2816) < 682;
    return isLeap ? 30 : 29;
}

function getFirstDayOffset(year, month) {
    const sampleDate = new Date(1921, 2, 21);
    let totalDays = 0;
    for (let y = 1300; y < year; y++) totalDays += (((((y - 474) % 2820) + 474) * 682) % 2816) < 682 ? 366 : 365;
    for (let m = 1; m < month; m++) totalDays += getDaysInMonth(year, m);
    return (sampleDate.getDay() + 1 + (totalDays % 7)) % 7;
}

async function render() {
    document.getElementById('monthSelect').value = currentMonth;
    document.getElementById('yearInput').value = currentYear;

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    weekDays.forEach(day => {
        const d = document.createElement('div');
        d.className = 'day-label';
        d.textContent = day;
        grid.appendChild(d);
    });

    const res = await fetch(`/api/events?year=${currentYear}&month=${currentMonth}`);
    currentMonthEvents = await res.json();

    const offset = getFirstDayOffset(currentYear, currentMonth);
    const daysCount = getDaysInMonth(currentYear, currentMonth);

    const realTodayParts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date());
    const realYear = parseInt(realTodayParts.find(p => p.type === 'year').value.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const realMonth = parseInt(realTodayParts.find(p => p.type === 'month').value.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
    const realDay = parseInt(realTodayParts.find(p => p.type === 'day').value.replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

    for (let i = 0; i < offset; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell empty';
        grid.appendChild(empty);
    }

    for (let day = 1; day <= daysCount; day++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        if (currentYear === realYear && currentMonth === realMonth && day === realDay) cell.classList.add('today');

        const isFriday = ((offset + day - 1) % 7) === 6;
        const dayEvents = currentMonthEvents.filter(e => e.day === day);
        const isHoliday = isFriday || dayEvents.some(e => e.isHoliday);

        cell.onclick = () => openModal(day, isFriday);

        const num = document.createElement('div');
        num.className = 'day-num';
        if (isHoliday) num.classList.add('holiday-num');
        num.textContent = day;
        cell.appendChild(num);

        dayEvents.forEach(e => {
            const tag = document.createElement('div');
            tag.className = 'event-tag';

            if (e.isCustom) {
                tag.classList.add('custom');
            } else if (e.isHoliday || isFriday) {
                tag.classList.add('holiday');
            }

            // Visually distinguish permanent events
            tag.textContent = e.isPermanent ? `🎂 ${e.title}` : e.title;
            tag.title = e.title;
            cell.appendChild(tag);
        });

        grid.appendChild(cell);
    }
}

function handleSelectorChange() {
    currentMonth = parseInt(document.getElementById('monthSelect').value);
    currentYear = parseInt(document.getElementById('yearInput').value);
    render();
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
    }
    render();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
    }
    render();
}

function goToToday() {
    setVariablesToToday();
    render();
}

function openModal(day, isFriday) {
    selectedDay = day;
    document.getElementById('modalTitle').textContent = `رویدادهای ${day} ${monthNames[currentMonth]}`;

    const eventList = document.getElementById('eventList');
    eventList.innerHTML = '';

    const dayEvents = currentMonthEvents.filter(e => e.day === day);
    if (dayEvents.length === 0) {
        const li = document.createElement('li');
        li.className = 'no-events';
        li.textContent = 'رویدادی برای این روز ثبت نشده است.';
        eventList.appendChild(li);
    } else {
        dayEvents.forEach(e => {
            const li = document.createElement('li');

            if (e.isCustom) {
                li.classList.add('custom');
            } else if (e.isHoliday || isFriday) {
                li.classList.add('holiday');
            }

            const eventText = document.createElement('span');
            // Check if it's permanent and add emoji
            eventText.textContent = e.isPermanent ? `🎂 ${e.title}` : e.title;
            li.appendChild(eventText);

            if (e.isCustom) {
                li.classList.add('event-item');
                const deleteButton = document.createElement('button');
                deleteButton.className = 'delete-event-btn';
                deleteButton.textContent = 'حذف';
                deleteButton.onclick = async (event) => {
                    event.stopPropagation();
                    if (!confirm(`آیا از حذف رویداد «${e.title}» مطمئن هستید؟`)) return;
                    try {
                        const response = await fetch(`/api/events/${e.id}`, { method: 'DELETE' });
                        if (!response.ok) {
                            alert('حذف رویداد انجام نشد.');
                            return;
                        }
                        await render();
                        const offset = getFirstDayOffset(currentYear, currentMonth);
                        const friday = ((offset + selectedDay - 1) % 7) === 6;
                        openModal(selectedDay, friday);
                    } catch (error) {
                        console.error(error);
                        alert('خطا در ارتباط با سرور.');
                    }
                };
                li.appendChild(deleteButton);
            }
            eventList.appendChild(li);
        });
    }

    document.getElementById('eventInput').value = '';

    // Ensure the checkbox exists and reset it when opening the modal
    const checkbox = document.getElementById('isPermanentEvent');
    if (checkbox) checkbox.checked = false;

    document.getElementById('eventModal').classList.add('active');
    setTimeout(() => document.getElementById('eventInput').focus(), 50);
}

function closeModal() {
    document.getElementById('eventModal').classList.remove('active');
}

async function submitEvent() {
    const title = document.getElementById('eventInput').value.trim();
    if (!title) return;

    // Grab the checkbox state (default to false if element is missing)
    const checkbox = document.getElementById('isPermanentEvent');
    const isPermanent = checkbox ? checkbox.checked : false;

    await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: title,
            year: currentYear,
            month: currentMonth,
            day: selectedDay,
            isHoliday: false,
            isPermanent: isPermanent // Send new flag to C# backend
        })
    });

    await render();
    const offset = getFirstDayOffset(currentYear, currentMonth);
    const isFriday = ((offset + selectedDay - 1) % 7) === 6;
    openModal(selectedDay, isFriday);
}

initializeSetup();
updateTime();
setInterval(updateTime, 1000);
render();