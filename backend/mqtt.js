// mqtt.js
var mqtt = require('mqtt');
const axios = require('axios');

const MQTT_SERVER = "broker.emqx.io";
const MQTT_PORT = "1883";
const MQTT_USER = "admin";
const MQTT_PASSWORD = "1234";

const MQTT_TOPIC = 'data/engine';

// เชื่อมต่อกับ MQTT Broker
var client = mqtt.connect({
    host: MQTT_SERVER,
    port: MQTT_PORT,
    username: MQTT_USER,
    password: MQTT_PASSWORD
});

// ฟังก์ชันเชื่อมต่อกับ MQTT
function connectMQTT() {
    client.on('connect', function () {
        console.log('Connected to MQTT broker');
        client.subscribe(MQTT_TOPIC, function (err) {
            if (err) {
                console.error('Subscription error:', err);
            } else {
                console.log(`Subscribed to topic: ${MQTT_TOPIC}`);
            }
        });
    });

    client.on('message', async function (topic, message) {
        if (topic === MQTT_TOPIC) {
            try {
                // แปลงข้อมูลที่ได้รับจาก MQTT เป็น JSON
                const data = JSON.parse(message.toString());

                // ส่งข้อมูลผ่าน POST API ไปยัง '/data/temperatures'
                await axios.post('http://localhost:3000/data/engine', data);
                console.log('Data sent to API:', data);
            } catch (err) {
                console.error('Error processing MQTT message:', err);
            }
        }
    });

    client.on('error', function (err) {
        console.error('MQTT Client Error:', err);
    });
}

// Export ฟังก์ชันนี้
module.exports = {
    connectMQTT
};
