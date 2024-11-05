# Use an official Node.js runtime as the base image
FROM node:16-alpine

# Set the working directory inside the container
WORKDIR /app

# Install dependencies (this will cache package.json and package-lock.json)
COPY package*.json ./

RUN npm install -g create-react-app

# Copy the current directory contents into the container
COPY . .

# Create the React app (if not already created)
RUN npx create-react-app fig

# Change directory into the app
WORKDIR /app/fig

# Install app dependencies
RUN npm install

# Expose the port the app runs on
EXPOSE 3000

# Start the app
CMD ["npm", "start"]