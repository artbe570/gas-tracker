const form = document.getElementById("refuel-form");
const tableBody = document.getElementById("records-table-body");
const avgConsumptionEl = document.getElementById("avg-consumption");
const totalFuelEl = document.getElementById("total-fuel");
const dateNativeInput = document.getElementById("date-native");
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

  const dateIso = dateNativeInput.value;
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
  dateNativeInput.addEventListener("click", openDatePicker);
}

function openDatePicker() {
  if (typeof dateNativeInput.showPicker === "function") {
    dateNativeInput.showPicker();
    return;
  }

  dateNativeInput.focus();
  dateNativeInput.click();
}

function applyFormDefaults() {
  const lastRecord = records[records.length - 1];
  dateNativeInput.value = getTodayIso();
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

  const rows = records.map((record, index) => {
    const previousRecord = records[index - 1];
    if (
      previousRecord &&
      previousRecord.fullTank &&
      record.fullTank &&
      record.odometer > previousRecord.odometer
    ) {
      totalDistance += record.odometer - previousRecord.odometer;
      totalFuelForConsumption += record.liters;
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
