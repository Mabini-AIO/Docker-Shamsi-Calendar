const monthNames = [
    "",
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند"
];

const weekDays = [
    "شنبه",
    "یکشنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنج‌شنبه",
    "جمعه"
];

let currentYear;
let currentMonth;
let currentDay;
let selectedDay = null;

let currentMonthEvents = [];

// ------------------------------------------
// Initialize
// ------------------------------------------

function initializeSetup() {

    setVariablesToToday();

    const monthSelect =
        document.getElementById('monthSelect');

    monthSelect.innerHTML = '';

    for (let i = 1; i <= 12; i++) {

        const option =
            document.createElement('option');

        option.value = i;
        option.textContent = monthNames[i];

        monthSelect.appendChild(option);
    }
}

// ------------------------------------------
// Persian date
// ------------------------------------------

function setVariablesToToday() {

    const parts =
        new Intl.DateTimeFormat(
            'fa-IR-u-ca-persian',
            {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            }
        ).formatToParts(new Date());

    const getPart = (type) => {

        return parseInt(
            parts
                .find(p => p.type === type)
                .value
                .replace(
                    /[۰-۹]/g,
                    d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)
                )
        );
    };

    currentYear = getPart('year');
    currentMonth = getPart('month');
    currentDay = getPart('day');
}

// ------------------------------------------
// Live clock
// ------------------------------------------

function updateTime() {

    const now = new Date();

    document.getElementById('liveTime')
        .textContent =
        new Intl.DateTimeFormat(
            'fa-IR',
            {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }
        ).format(now);
}

// ------------------------------------------
// Days in Persian month
// ------------------------------------------

function getDaysInMonth(year, month) {

    if (month <= 6)
        return 31;

    if (month <= 11)
        return 30;

    const isLeap =
        (((((year - 474) % 2820) + 474) * 682) % 2816) < 682;

    return isLeap ? 30 : 29;
}

// ------------------------------------------
// First day of month
// ------------------------------------------

function getFirstDayOffset(year, month) {

    const sampleDate =
        new Date(1921, 2, 21);

    let totalDays = 0;

    for (let y = 1300; y < year; y++) {

        totalDays +=
            (((((y - 474) % 2820) + 474) * 682) % 2816) < 682
                ? 366
                : 365;
    }

    for (let m = 1; m < month; m++) {

        totalDays +=
            getDaysInMonth(year, m);
    }

    return (
        sampleDate.getDay() +
        1 +
        (totalDays % 7)
    ) % 7;
}

// ------------------------------------------
// Render calendar
// ------------------------------------------

async function render() {

    document.getElementById('monthSelect').value =
        currentMonth;

    document.getElementById('yearInput').value =
        currentYear;

    const grid =
        document.getElementById('calendarGrid');

    grid.innerHTML = '';

    // Week day headers
    weekDays.forEach(day => {

        const d =
            document.createElement('div');

        d.className = 'day-label';
        d.textContent = day;

        grid.appendChild(d);
    });

    // Load events
    const res =
        await fetch(
            `/api/events?year=${currentYear}&month=${currentMonth}`
        );

    currentMonthEvents =
        await res.json();

    const offset =
        getFirstDayOffset(
            currentYear,
            currentMonth
        );

    const daysCount =
        getDaysInMonth(
            currentYear,
            currentMonth
        );

    // Real today
    const realTodayParts =
        new Intl.DateTimeFormat(
            'fa-IR-u-ca-persian',
            {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric'
            }
        ).formatToParts(new Date());

    const realYear =
        parseInt(
            realTodayParts
                .find(p => p.type === 'year')
                .value
                .replace(
                    /[۰-۹]/g,
                    d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)
                )
        );

    const realMonth =
        parseInt(
            realTodayParts
                .find(p => p.type === 'month')
                .value
                .replace(
                    /[۰-۹]/g,
                    d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)
                )
        );

    const realDay =
        parseInt(
            realTodayParts
                .find(p => p.type === 'day')
                .value
                .replace(
                    /[۰-۹]/g,
                    d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)
                )
        );

    // Empty cells
    for (let i = 0; i < offset; i++) {

        const empty =
            document.createElement('div');

        empty.className =
            'day-cell empty';

        grid.appendChild(empty);
    }

    // Calendar days
    for (let day = 1; day <= daysCount; day++) {

        const cell =
            document.createElement('div');

        cell.className =
            'day-cell';

        // Today
        if (
            currentYear === realYear &&
            currentMonth === realMonth &&
            day === realDay
        ) {

            cell.classList.add('today');
        }

        // Friday
        const isFriday =
            ((offset + day - 1) % 7) === 6;

        // Events for this day
        const dayEvents =
            currentMonthEvents.filter(
                e => e.day === day
            );

        // Holiday from database OR Friday
        const isHoliday =
            isFriday ||
            dayEvents.some(e => e.isHoliday);

        cell.onclick =
            () => openModal(day, isFriday);

        // Day number
        const num =
            document.createElement('div');

        num.className =
            'day-num';

        if (isHoliday) {
            num.classList.add('holiday-num');
        }

        num.textContent = day;

        cell.appendChild(num);

        // Events
        dayEvents.forEach(e => {

            const tag =
                document.createElement('div');

            tag.className =
                'event-tag';

            if (e.isHoliday || isFriday) {
                tag.classList.add('holiday');
            }

            tag.textContent =
                e.title;

            tag.title =
                e.title;

            cell.appendChild(tag);
        });

        grid.appendChild(cell);
    }
}

// ------------------------------------------
// Month selector
// ------------------------------------------

function handleSelectorChange() {

    currentMonth =
        parseInt(
            document.getElementById('monthSelect').value
        );

    currentYear =
        parseInt(
            document.getElementById('yearInput').value
        );

    render();
}

// ------------------------------------------
// Previous month
// ------------------------------------------

function prevMonth() {

    currentMonth--;

    if (currentMonth < 1) {

        currentMonth = 12;
        currentYear--;
    }

    render();
}

// ------------------------------------------
// Next month
// ------------------------------------------

function nextMonth() {

    currentMonth++;

    if (currentMonth > 12) {

        currentMonth = 1;
        currentYear++;
    }

    render();
}

// ------------------------------------------
// Today
// ------------------------------------------

function goToToday() {

    setVariablesToToday();

    render();
}

// ------------------------------------------
// Open event modal
// ------------------------------------------

function openModal(day, isFriday) {

    selectedDay = day;

    document.getElementById('modalTitle')
        .textContent =
        `رویدادهای ${day} ${monthNames[currentMonth]}`;

    const eventList =
        document.getElementById('eventList');

    eventList.innerHTML = '';

    const dayEvents =
        currentMonthEvents.filter(
            e => e.day === day
        );

    // No events
    if (dayEvents.length === 0) {

        const li =
            document.createElement('li');

        li.className =
            'no-events';

        li.textContent =
            'رویدادی برای این روز ثبت نشده است.';

        eventList.appendChild(li);
    }

    // Events
    else {

        dayEvents.forEach(e => {

            const li =
                document.createElement('li');

            if (e.isHoliday || isFriday) {
                li.classList.add('holiday');
            }

            const eventText =
                document.createElement('span');

            eventText.textContent =
                e.title;

            li.appendChild(eventText);

            // Delete button only for custom events
            if (e.isCustom) {

                li.classList.add('event-item');

                const deleteButton =
                    document.createElement('button');

                deleteButton.className =
                    'delete-event-btn';

                deleteButton.textContent =
                    'حذف';

                deleteButton.onclick =
                    async (event) => {

                        event.stopPropagation();

                        const confirmed =
                            confirm(
                                `آیا از حذف رویداد «${e.title}» مطمئن هستید؟`
                            );

                        if (!confirmed) {
                            return;
                        }

                        try {

                            const response =
                                await fetch(
                                    `/api/events/${e.id}`,
                                    {
                                        method: 'DELETE'
                                    }
                                );

                            if (!response.ok) {

                                alert(
                                    'حذف رویداد انجام نشد.'
                                );

                                return;
                            }

                            await render();

                            const offset =
                                getFirstDayOffset(
                                    currentYear,
                                    currentMonth
                                );

                            const friday =
                                ((offset + selectedDay - 1) % 7) === 6;

                            openModal(
                                selectedDay,
                                friday
                            );

                        }
                        catch (error) {

                            console.error(error);

                            alert(
                                'خطا در ارتباط با سرور.'
                            );
                        }
                    };

                li.appendChild(deleteButton);
            }

            eventList.appendChild(li);
        });
    }

    document.getElementById('eventInput').value = '';

    document.getElementById('eventModal')
        .classList.add('active');

    setTimeout(() => {

        document.getElementById('eventInput')
            .focus();

    }, 50);
}

// ------------------------------------------
// Close modal
// ------------------------------------------

function closeModal() {

    document.getElementById('eventModal')
        .classList.remove('active');
}

// ------------------------------------------
// Submit event
// ------------------------------------------

async function submitEvent() {

    const title =
        document.getElementById('eventInput')
            .value
            .trim();

    if (!title) {
        return;
    }

    await fetch(
        '/api/events',
        {
            method: 'POST',

            headers: {
                'Content-Type':
                    'application/json'
            },

            body: JSON.stringify({
                title: title,
                year: currentYear,
                month: currentMonth,
                day: selectedDay,
                isHoliday: false
            })
        }
    );

    await render();

    const offset =
        getFirstDayOffset(
            currentYear,
            currentMonth
        );

    const isFriday =
        ((offset + selectedDay - 1) % 7) === 6;

    openModal(
        selectedDay,
        isFriday
    );
}

// ------------------------------------------
// Start application
// ------------------------------------------

initializeSetup();

updateTime();

setInterval(
    updateTime,
    1000
);

render();
