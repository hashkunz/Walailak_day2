import time
import paho.mqtt.client as mqtt
import json
import random

client = mqtt.Client()
client.username_pw_set("admin", "1234")
client.connect("broker.emqx.io", 1883, 60)

while True:
    # Define the message payload
    message_payload1 = {
        "prediction": "1",
        "amplitude": 80,
        "timestamp": "2024-11-08T16:59:59Z"
    }
    message_payload2 = {
        "prediction": "0",
        "amplitude": 13,
        "timestamp": "2024-11-08T16:59:59Z"
    }
    message_payload3 = {
        "prediction": "1",
        "amplitude": 130,
        "timestamp": "2024-11-08T16:59:59Z"
    }
    
    # Randomly choose one of the payloads
    mess_rand = random.choice([message_payload1, message_payload2, message_payload3])
    
    # Convert the payload to JSON
    message_json = json.dumps(mess_rand)
    
    # Publish message
    client.publish("data/engine", message_json)
    print(f"scripts      | publish data {message_json}")
    
    # Wait 10 seconds before the next message
    time.sleep(10)

client.disconnect()
