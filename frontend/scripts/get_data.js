var ws;
let latestData = null; // ตัวแปรเก็บข้อมูลล่าสุดจาก WebSocket

function connect(event) {
    var apiKey = document.getElementById("api_key").value;
    ws = new WebSocket("ws://technest.ddns.net:8001/ws");
    ws.onopen = function (event) {
        ws.send(apiKey);
    };
    ws.onmessage = function (event) {
        var messages = document.getElementById("messages");
        var message = document.createElement("div");
        message.innerHTML = event.data;
        messages.appendChild(message);

        // บันทึกข้อมูลล่าสุดจาก WebSocket
        try {
            latestData = JSON.parse(event.data); // แปลงข้อความเป็น JSON
        } catch (error) {
            console.error('Error parsing JSON:', error);
        }
    };
    event.preventDefault();

    // ส่งข้อมูลไปยัง API ทุก ๆ 2 วินาที
    setInterval(() => {
        if (latestData) {
            sendDataToAPI(latestData);
        }
    }, 2000);
}

// ฟังก์ชันส่งข้อมูล JSON ไปยัง API พร้อมเพิ่ม timestamp
function sendDataToAPI(data) {
    // เพิ่ม timestamp ปัจจุบันในรูปแบบ ISO
    const dataWithTimestamp = {
        ...data,
        timestamp: new Date().toISOString()
    };

    fetch('http://localhost:3000/data/engine/insert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataWithTimestamp) // แปลง JSON Object เป็น string ก่อนส่ง
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(result => {
        console.log('Data sent to API successfully:', result);
    })
    .catch(error => {
        console.error('Error sending data to API:', error);
    });
}
