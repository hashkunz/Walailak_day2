var ws;
let powerSeries = [];
let voltageSeries = { L1: [], L2: [], L3: [] };
let pressureSeries = [];
let forceSeries = [];
const maxDataPoints = 30;

function connect(event) {
    var apiKey = document.getElementById("api_key").value;
    ws = new WebSocket("ws://technest.ddns.net:8001/ws");
    ws.onopen = function (event) {
        ws.send(apiKey);
    };
    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);
        const timestamp = new Date().getTime();
        updateCurrentValues(data); // อัปเดตค่าปัจจุบัน
        updateCharts(data, timestamp);
    };
    event.preventDefault();
}

function updateCurrentValues(data) {
    document.getElementById("currentPower").innerText = `Power: ${data["Energy Consumption"].Power.toFixed(2)} W`;
    document.getElementById("currentVoltage").innerText = `Voltage: ${data.Voltage["L1-GND"].toFixed(2)} V (L1)`;
    document.getElementById("currentPressure").innerText = `Pressure: ${data.Pressure.toFixed(2)} Pa`;
    document.getElementById("currentForce").innerText = `Force: ${data.Force.toFixed(2)} N`;
}

function updateCharts(data, timestamp) {
    // Update Power Chart
    powerSeries.push({ x: timestamp, y: data["Energy Consumption"].Power });
    if (powerSeries.length > maxDataPoints) powerSeries.shift();

    ApexCharts.exec('powerChart', 'updateSeries', [{ data: powerSeries }]);

    // Update Voltage Chart
    voltageSeries.L1.push({ x: timestamp, y: data.Voltage["L1-GND"] });
    voltageSeries.L2.push({ x: timestamp, y: data.Voltage["L2-GND"] });
    voltageSeries.L3.push({ x: timestamp, y: data.Voltage["L3-GND"] });
    if (voltageSeries.L1.length > maxDataPoints) {
        voltageSeries.L1.shift();
        voltageSeries.L2.shift();
        voltageSeries.L3.shift();
    }

    ApexCharts.exec('voltageChart', 'updateSeries', [
        { name: 'L1-GND', data: voltageSeries.L1 },
        { name: 'L2-GND', data: voltageSeries.L2 },
        { name: 'L3-GND', data: voltageSeries.L3 }
    ]);

    // Update Pressure Chart
    pressureSeries.push({ x: timestamp, y: data.Pressure });
    if (pressureSeries.length > maxDataPoints) pressureSeries.shift();

    ApexCharts.exec('pressureChart', 'updateSeries', [{ data: pressureSeries }]);

    // Update Force Chart
    forceSeries.push({ x: timestamp, y: data.Force });
    if (forceSeries.length > maxDataPoints) forceSeries.shift();

    ApexCharts.exec('forceChart', 'updateSeries', [{ data: forceSeries }]);
}

// สร้างกราฟ ApexCharts สำหรับ Power
const powerChart = new ApexCharts(document.querySelector("#powerChart"), {
    chart: {
        id: 'powerChart',
        type: 'line',
        height: 300,
        animations: { enabled: false }
    },
    series: [{ name: 'Power', data: [] }],
    xaxis: { type: 'datetime' },
    title: { text: 'Power Consumption (W)' }
});
powerChart.render();

// สร้างกราฟ ApexCharts สำหรับ Voltage
const voltageChart = new ApexCharts(document.querySelector("#voltageChart"), {
    chart: {
        id: 'voltageChart',
        type: 'line',
        height: 300,
        animations: { enabled: false }
    },
    series: [
        { name: 'L1-GND', data: [] },
        { name: 'L2-GND', data: [] },
        { name: 'L3-GND', data: [] }
    ],
    xaxis: { type: 'datetime' },
    title: { text: 'Voltage (V)' }
});
voltageChart.render();

// สร้างกราฟ ApexCharts สำหรับ Pressure
const pressureChart = new ApexCharts(document.querySelector("#pressureChart"), {
    chart: {
        id: 'pressureChart',
        type: 'line',
        height: 300,
        animations: { enabled: false }
    },
    series: [{ name: 'Pressure', data: [] }],
    xaxis: { type: 'datetime' },
    title: { text: 'Pressure (Pa)' }
});
pressureChart.render();

// สร้างกราฟ ApexCharts สำหรับ Force
const forceChart = new ApexCharts(document.querySelector("#forceChart"), {
    chart: {
        id: 'forceChart',
        type: 'line',
        height: 300,
        animations: { enabled: false }
    },
    series: [{ name: 'Force', data: [] }],
    xaxis: { type: 'datetime' },
    title: { text: 'Force (N)' }
});
forceChart.render();
