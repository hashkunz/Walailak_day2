# Use Node.js LTS version
FROM node:18

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
# Other setup configurations
RUN npm install
RUN npm install socket.io

# Copy the rest of the application code
COPY . .

# Expose the backend port
EXPOSE 3000

# Command to run the server
CMD ["npm", "start"]
