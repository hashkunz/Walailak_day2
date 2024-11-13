// index.js
google.charts.load("current", { packages: ["corechart"] });
google.charts.setOnLoadCallback(loadTable);


async function loadTable() {
    try {
        const response = await fetch('http://localhost:3000/slist');
        const data = await response.json();
        populateTable(data);
        drawChart(data);
        drawPredictionChart(data);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

let realTimeData = [];
let predictionCounts = { normal: 0, abnormal: 0 };

// ฟังก์ชันเชื่อมต่อกับ WebSocket Server
const socket = new WebSocket('ws://localhost:3000');


// เมื่อมีข้อมูลใหม่ส่งมาจาก server
socket.onmessage = function (event) {
    const newData = JSON.parse(event.data);
    addNewRow(newData);
    updateChart(newData); // อัปเดตกราฟแบบเรียลไทม์
    updatePredictionChart(newData); // อัปเดตกราฟ Prediction Status
};

// ฟังก์ชันเพิ่มแถวใหม่ในตาราง
function addNewRow(data) {
    const tableBody = document.querySelector("#dataTable tbody");
    const timestamp = new Date(data.timestamp).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // แปลงค่าจาก 1 และ 0 เป็น "normal" และ "abnormal"
    const predictionText = data.prediction === 1 ? "normal" : "abnormal";
    const predictionColor = predictionText === "abnormal" ? 'color: red;' : '';

    const newRow = `
        <tr>
            <td>${tableBody.rows.length + 1}</td>
            <td style="${predictionColor}">${predictionText}</td>
            <td>${data.amplitude}</td>
            <td>${timestamp}</td>
        </tr>
    `;
    tableBody.insertAdjacentHTML('beforeend', newRow);
}


// ฟังก์ชันสร้างและเติมข้อมูลในตาราง
function populateTable(data) {
    let tableBody = document.querySelector("#dataTable tbody");
    tableBody.innerHTML = data.map((entry, index) => {
        const timestamp = new Date(entry.timestamp).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        const predictionColor = entry.prediction === "abnormal" ? 'color: red;' : '';
        
        return `
            <tr>
                <td>${index + 1}</td>
                <td style="${predictionColor}">${entry.prediction}</td>
                <td>${entry.amplitude}</td>
                <td>${timestamp}</td>
            </tr>
        `;
    }).join('');
}

// ฟังก์ชันสร้างกราฟ
function drawChart(data) {
    realTimeData = data.map(entry => [
        new Date(entry.timestamp), 
        entry.amplitude
    ]);

    const dataTable = google.visualization.arrayToDataTable([
        ["timestamp", "amplitude"],
        ...realTimeData
    ]);

    const options = {
        title: "Amplitude Over Time",
        hAxis: { title: 'Timestamp' },
        vAxis: { title: 'Amplitude' },
        legend: { position: 'bottom' }
    };
    
    const chart = new google.visualization.LineChart(document.getElementById("chartContainer"));
    chart.draw(dataTable, options);
}

// ฟังก์ชันอัปเดตกราฟเส้นแบบเรียลไทม์
function updateChart(newData) {
    realTimeData.push([
        new Date(newData.timestamp), 
        newData.amplitude
    ]);

    if (realTimeData.length > 50) {
        realTimeData.shift(); // ลบข้อมูลเก่าหากมีมากกว่า 50 ข้อมูล
    }

    const dataTable = google.visualization.arrayToDataTable([
        ["timestamp", "amplitude"],
        ...realTimeData
    ]);

    const chart = new google.visualization.LineChart(document.getElementById("chartContainer"));
    chart.draw(dataTable, {
        title: "Amplitude Over Time",
        hAxis: { title: 'Timestamp' },
        vAxis: { title: 'Amplitude' },
        legend: { position: 'bottom' }
    });
}

// ฟังก์ชันสร้างกราฟ Prediction Status
function drawPredictionChart(data) {
    predictionCounts = { normal: 0, abnormal: 0 };

    data.forEach(entry => {
        if (entry.prediction === "normal") {
            predictionCounts.normal += 1;
        } else if (entry.prediction === "abnormal") {
            predictionCounts.abnormal += 1;
        }
    });

    const chartData = google.visualization.arrayToDataTable([
        ["Prediction", "Count"],
        ["Normal", predictionCounts.normal],
        ["Abnormal", predictionCounts.abnormal]
    ]);

    const options = {
        title: "Prediction Status Count",
        hAxis: { title: 'Prediction Status' },
        vAxis: { title: 'Count' },
        legend: { position: 'none' }
    };

    const chart = new google.visualization.ColumnChart(document.getElementById("predictionChartContainer"));
    chart.draw(chartData, options);
}


// ฟังก์ชันอัปเดตกราฟ Prediction Status แบบเรียลไทม์
function updatePredictionChart(newData) {
    const predictionText = newData.prediction === 1 ? "normal" : "abnormal";
    if (predictionText === "normal") {
        predictionCounts.normal += 1;
    } else if (predictionText === "abnormal") {
        predictionCounts.abnormal += 1;
    }

    const chartData = google.visualization.arrayToDataTable([
        ["Prediction", "Count"],
        ["Normal", predictionCounts.normal],
        ["Abnormal", predictionCounts.abnormal]
    ]);

    const chart = new google.visualization.ColumnChart(document.getElementById("predictionChartContainer"));
    chart.draw(chartData, {
        title: "Prediction Status Count",
        hAxis: { title: 'Prediction Status' },
        vAxis: { title: 'Count' },
        legend: { position: 'none' }
    });
}


// ตัวแปรเพื่อจัดการกับ MQTT client
let client;
let subscribedTopic = null;

document.getElementById('subscribeButton').addEventListener('click', function () {
    const topic = document.getElementById('topicInput').value.trim();
    if (topic) {
        subscribeToTopic(topic);
    }
});

function subscribeToTopic(topic) {
    // ถ้ามี client เดิมอยู่แล้วให้ยกเลิกการ subscribe เดิมก่อน
    if (client && subscribedTopic) {
        client.unsubscribe(subscribedTopic);
    }

    // เก็บหัวข้อที่ subscribe ไว้
    subscribedTopic = topic;

    // ซ่อนตารางและแสดง container สำหรับ JSON
    document.querySelector(".table-responsive").style.display = 'none';
    let jsonContainer = document.getElementById('jsonContainer');
    if (!jsonContainer) {
        jsonContainer = document.createElement('pre');
        jsonContainer.id = 'jsonContainer';
        jsonContainer.style.padding = '20px';
        document.querySelector(".container-fluid").appendChild(jsonContainer);
    } else {
        jsonContainer.innerHTML = ''; // ล้างข้อมูลเดิม
    }

    // เชื่อมต่อกับ MQTT broker และ subscribe หัวข้อใหม่
    client = mqtt.connect('ws://broker.emqx.io:1883');
    client.on('connect', function () {
        console.log(`Connected to MQTT broker. Subscribing to topic: ${topic}`);
        client.subscribe(topic);
    });

    client.on('message', function (receivedTopic, message) {
        if (receivedTopic === topic) {
            const jsonData = JSON.parse(message.toString());
            jsonContainer.innerHTML = JSON.stringify(jsonData, null, 2); // แสดงข้อมูลในรูปแบบ JSON
        }
    });
}
