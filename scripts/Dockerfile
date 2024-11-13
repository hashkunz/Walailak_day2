# Use an official Python runtime as a base image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the Python scripts into the container
COPY pub.py /app/pub.py
COPY sub.py /app/sub.py

# Install required Python packages
RUN pip install paho-mqtt
RUN pip install pymongo

# Default command for this container
# This allows us to pass the script name (pub.py or sub.py) when we run the container
ENTRYPOINT ["python"]
