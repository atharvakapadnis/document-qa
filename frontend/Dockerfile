FROM node:18

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# For development, expose port and start dev server
EXPOSE 3000
CMD ["npm", "start"]