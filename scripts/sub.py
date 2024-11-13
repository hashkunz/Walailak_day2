import paho.mqtt.client as mqtt

# Define the callback function to handle received messages
def on_message(client, userdata, msg):
    print(f"scripts      | subscribe data {msg.payload.decode()}")

# Set up MQTT client
client = mqtt.Client()
client.username_pw_set("admin", "1234")
client.connect("broker.emqx.io", 1883, 60)

# Subscribe to the topic
client.subscribe("data/engine")
client.on_message = on_message  # Attach the callback function

# Start the loop to listen for messages indefinitely
client.loop_forever()
