const form = document.getElementById("refuel-form");
const tableBody = document.getElementById("records-table-body");
const avgConsumptionEl = document.getElementById("avg-consumption");
const totalFuelEl = document.getElementById("total-fuel");
const dateDisplayInput = document.getElementById("date-display");
const datePickerButton = document.getElementById("date-picker-btn");
const datePickerMenu = document.getElementById("date-picker-menu");
const calDay = document.getElementById("cal-day");
const calMonth = document.getElementById("cal-month");
const calYear = document.getElementById("cal-year");
const calApply = document.getElementById("cal-apply");
const odometerInput = document.getElementById("odometer");
const litersInput = document.getElementById("liters");
const priceInput = document.getElementById("price");
const fuelTypeInput = document.getElementById("fuel-type");
const fullTankInput = document.getElementById("full-tank");

const STORAGE_KEY = "gas_refuel_records_v1";
let records = loadRecords();

setupDatePicker();
applyFormDefaults();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const dateIso = getMenuIsoDate();
  const odometer = Number(odometerInput.value);
  const liters = Number(litersInput.value);
  const price = Number(priceInput.value);
  const fuelType = fuelTypeInput.value;
  const fullTank = fullTankInput.checked;

  if (!dateIso) {
    openDatePicker();
    return;
  }

  if (odometer <= 0 || liters <= 0 || price < 0 || !fuelType) {
    return;
  }

  records.push({ date: dateIso, odometer, liters, price, fuelType, fullTank });
  records.sort((a, b) => a.odometer - b.odometer);
  saveRecords(records);
  render();
  applyFormDefaults();
  litersInput.value = "";
  fullTankInput.checked = true;
});

tableBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const deleteButton = target.closest(".delete-btn");
  if (!deleteButton) {
    return;
  }

  const index = Number(deleteButton.dataset.index);
  if (Number.isNaN(index)) {
    return;
  }

  records.splice(index, 1);
  saveRecords(records);
  render();
  applyFormDefaults();
});

function setupDatePicker() {
  initDateMenuOptions();
  datePickerButton.addEventListener("click", toggleDatePicker);
  dateDisplayInput.addEventListener("click", openDatePicker);
  datePickerButton.addEventListener("keydown", handleDatePickerKeyboard);
  dateDisplayInput.addEventListener("keydown", handleDatePickerKeyboard);
  calMonth.addEventListener("change", syncDayOptionsForMenu);
  calYear.addEventListener("change", syncDayOptionsForMenu);
  calApply.addEventListener("click", applyDateFromMenu);
  document.addEventListener("click", handleOutsideDateMenuClick);
}

function initDateMenuOptions() {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 30;
  const endYear = currentYear + 5;

  for (let month = 1; month <= 12; month += 1) {
    const monthValue = String(month).padStart(2, "0");
    const option = new Option(monthValue, monthValue);
    calMonth.add(option);
  }

  for (let year = endYear; year >= startYear; year -= 1) {
    const option = new Option(String(year), String(year));
    calYear.add(option);
  }
}

function handleDatePickerKeyboard(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  openDatePicker();
}

function toggleDatePicker() {
  if (datePickerMenu.hidden) {
    openDatePicker();
  } else {
    closeDatePicker();
  }
}

function openDatePicker() {
  datePickerMenu.hidden = false;
}

function closeDatePicker() {
  datePickerMenu.hidden = true;
}

function handleOutsideDateMenuClick(event) {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (datePickerMenu.contains(target) || datePickerButton.contains(target) || dateDisplayInput.contains(target)) {
    return;
  }

  closeDatePicker();
}

function syncDateDisplayFromMenu() {
  dateDisplayInput.value = formatIsoDateRu(getMenuIsoDate());
}

function syncDayOptionsForMenu() {
  const year = Number(calYear.value);
  const month = Number(calMonth.value);
  if (!year || !month) {
    return;
  }

  const previousDay = calDay.value;
  const daysInMonth = new Date(year, month, 0).getDate();
  calDay.innerHTML = "";

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dayValue = String(day).padStart(2, "0");
    calDay.add(new Option(dayValue, dayValue));
  }

  calDay.value = Number(previousDay) <= daysInMonth ? previousDay : "01";
}

function applyDateFromMenu() {
  syncDateDisplayFromMenu();
  closeDatePicker();
}

function applyFormDefaults() {
  const lastRecord = records[records.length - 1];
  const todayIso = getTodayIso();

  setMenuDate(todayIso);

  odometerInput.value = lastRecord ? String(lastRecord.odometer.toFixed(1)) : "";
  priceInput.value = lastRecord ? String(lastRecord.price.toFixed(2)) : "";
  fuelTypeInput.value = lastRecord?.fuelType || "АИ-95";
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalized = parsed
      .map((item) => {
        const date = normalizeToIsoDate(item.date);
        const odometer = Number(item.odometer);
        const liters = Number(item.liters);
        const price = Number(item.price);

        if (!date || Number.isNaN(odometer) || Number.isNaN(liters) || Number.isNaN(price)) {
          return null;
        }

        return {
          date,
          odometer,
          liters,
          price,
          fuelType: item.fuelType || "АИ-95",
          fullTank: item.fullTank !== false,
        };
      })
      .filter(Boolean);

    normalized.sort((a, b) => a.odometer - b.odometer);
    return normalized;
  } catch (error) {
    return [];
  }
}

function saveRecords(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function render() {
  if (records.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="8" class="empty">Записей пока нет.</td></tr>';
    avgConsumptionEl.textContent = "-";
    totalFuelEl.textContent = "0 л";
    return;
  }

  let totalDistance = 0;
  let totalFuelForConsumption = 0;
  let lastFullIndex = null;

  const rows = records.map((record, index) => {
    if (record.fullTank) {
      if (lastFullIndex !== null) {
        const previousFullRecord = records[lastFullIndex];
        if (record.odometer > previousFullRecord.odometer) {
          const distance = record.odometer - previousFullRecord.odometer;
          const fuelUsed = records
            .slice(lastFullIndex + 1, index + 1)
            .reduce((sum, item) => sum + item.liters, 0);
          totalDistance += distance;
          totalFuelForConsumption += fuelUsed;
        }
      }
      lastFullIndex = index;
    }

    const cost = record.liters * record.price;
    return `
      <tr>
        <td>${escapeHtml(formatIsoDateRu(record.date))}</td>
        <td>${escapeHtml(record.fuelType)}</td>
        <td>${record.odometer.toFixed(1)}</td>
        <td>${record.liters.toFixed(2)}</td>
        <td>${record.price.toFixed(2)} ₽</td>
        <td>${cost.toFixed(2)} ₽</td>
        <td>${record.fullTank ? "Да" : "Нет"}</td>
        <td>
          <button
            type="button"
            class="delete-btn"
            data-index="${index}"
            title="Удалить запись"
            aria-label="Удалить запись"
          >
            🗑
          </button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = rows.join("");

  if (totalDistance > 0) {
    const averageConsumption = (totalFuelForConsumption / totalDistance) * 100;
    avgConsumptionEl.textContent = `${averageConsumption.toFixed(2)} л/100 км`;
  } else {
    avgConsumptionEl.textContent = "-";
  }

  totalFuelEl.textContent = `${totalFuelForConsumption.toFixed(2)} л`;
}

function formatIsoDateRu(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate || "");
  if (!match) {
    return "";
  }

  return `${match[3]}.${match[2]}.${match[1]}`;
}

function setMenuDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate || "");
  if (!match) {
    return;
  }

  calYear.value = match[1];
  calMonth.value = match[2];
  syncDayOptionsForMenu();
  calDay.value = match[3];
  syncDateDisplayFromMenu();
}

function getMenuIsoDate() {
  const year = calYear.value;
  const month = calMonth.value;
  const day = calDay.value;
  if (!year || !month || !day) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function normalizeToIsoDate(value) {
  if (typeof value !== "string") {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const ru = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (ru) {
    return `${ru[3]}-${ru[2]}-${ru[1]}`;
  }

  const en = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (en) {
    return `${en[3]}-${en[1]}-${en[2]}`;
  }

  return "";
}

function getTodayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
