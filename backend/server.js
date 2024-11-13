const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { connectMQTT } = require('./mqtt');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const port = 3000;
const JWT_SECRET = 'S3cr3tK3y_jwT@2024_Random!x19YZ';

// app.use(bodyParser.json());
// app.use(cors());
app.use(express.json()); // ใช้ Express ในตัวแทน body-parser
app.use(cors());

// MongoDB connection
const uri = 'mongodb://mongodb:27017/tesadb';
const client = new MongoClient(uri);

client.connect()
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Connection error:', err);
  });

const db = client.db();
const engineCollection = db.collection('engine');
const machineCollection = db.collection('machine'); // สร้าง collection สำหรับ machine

// สร้าง HTTP Server จาก Express
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// เมื่อมี client เชื่อมต่อเข้ามา
wss.on('connection', (ws) => {
    console.log('Client connected');
});

// แจ้งเตือนข้อมูลใหม่
function notifyClients(newData) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(newData));
        }
    });
}

// รับ topic ใหม่จาก MQTT และส่งไปที่ WebSocket
function handleMQTTMessage(topic, message) {
    const data = JSON.parse(message.toString());
    console.log(`New message on topic ${topic}:`, data);
    notifyClients(data); // แจ้งเตือน WebSocket client
}

connectMQTT(handleMQTTMessage);

// Middleware ตรวจสอบ JWT
function authenticateJWT(req, res, next) {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Access Token Required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid Token' });
        }
        req.user = user;
        next();
    });
}

// สร้าง token สำหรับทดสอบ (POST /login พร้อม username, password)
app.post('/login', (req, res) => {
    console.log("Headers:", req.headers);
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Request Body:", req.body); // ตรวจสอบค่า req.body

    const { username, password } = req.body;

    if (username && password) {
        const accessToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ accessToken });
    } else {
        res.status(400).json({ message: 'Username and password required' });
    }
});




// API POST สร้างข้อมูลเครื่องใหม่
app.post('/api/machine', authenticateJWT, async (req, res) => {
    try {
        const data = req.body;
        const result = await machineCollection.insertOne(data);
        res.status(201).json({ message: 'Machine data created', id: result.insertedId });
    } catch (err) {
        console.error('Error creating machine data:', err);
        res.status(500).json({ message: 'Error creating machine data' });
    }
});

// API GET ดึงข้อมูลเครื่องทั้งหมด
app.get('/api/machine', authenticateJWT, async (req, res) => {
    try {
        const data = await machineCollection.find().toArray();
        res.json(data);
    } catch (err) {
        console.error('Error fetching machine data:', err);
        res.status(500).json({ message: 'Error fetching machine data' });
    }
});

// API PUT อัปเดตข้อมูลเครื่องตาม ID
app.put('/api/machine/:id', authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const result = await machineCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: data }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'Machine data not found' });
        }
        res.json({ message: 'Machine data updated' });
    } catch (err) {
        console.error('Error updating machine data:', err);
        res.status(500).json({ message: 'Error updating machine data' });
    }
});

// API DELETE ลบข้อมูลเครื่องตาม ID
app.delete('/api/machine/:id', authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await machineCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Machine data not found' });
        }
        res.json({ message: 'Machine data deleted' });
    } catch (err) {
        console.error('Error deleting machine data:', err);
        res.status(500).json({ message: 'Error deleting machine data' });
    }
});

// API สำหรับบันทึกข้อมูลลงใน collection `engine`
app.post('/data/engine', async (req, res) => {
    try {
        let { prediction, amplitude, timestamp } = req.body;
        if (!prediction) prediction = req.query.prediction;
        if (!amplitude) amplitude = req.query.amplitude;
        if (!timestamp) timestamp = req.query.timestamp;

        if (prediction == null || amplitude == null) {
            return res.status(400).send('prediction and amplitude are required');
        }

        prediction = parseInt(prediction) === 1 ? 1 : 0;
        amplitude = parseFloat(amplitude);
        timestamp = timestamp || new Date();

        if (isNaN(amplitude)) {
            return res.status(400).send('amplitude must be a valid number');
        }

        const newEngine = { prediction, amplitude, timestamp };
        await engineCollection.insertOne(newEngine);
        notifyClients(newEngine); // แจ้งเตือน client ที่เชื่อมต่อว่ามีข้อมูลใหม่

        res.status(201).send('Data saved now');
    } catch (err) {
        console.error('Error saving data:', err);
        res.status(500).send('Internal Server Error');
    }
});

// API สำหรับบันทึกข้อมูลลงใน collection `machine`
app.post('/data/engine/insert', async (req, res) => {
    try {
        let data;
        if (typeof req.body === 'string') {
            data = JSON.parse(req.body);
        } else {
            data = req.body;
        }

        await machineCollection.insertOne(data);
        console.log('Data inserted into machine collection:', data);
        res.status(201).json({ message: 'Data inserted successfully into machine collection' });
    } catch (err) {
        console.error('Error inserting data into machine collection:', err);
        res.status(500).json({ message: 'Error inserting data' });
    }
});

app.get('/slist', async (req, res) => {
    try {
        const data = await engineCollection.find().toArray();
        const formattedData = data.map(item => ({
            prediction: item.prediction === 1 ? "normal" : "abnormal",
            amplitude: parseFloat(item.amplitude),
            timestamp: item.timestamp
        }));
        res.json(formattedData);
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Internal Server Error');
    }
});

// เริ่ม server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
