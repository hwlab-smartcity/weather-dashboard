FROM node:20-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Build the Vite React app (this creates the 'dist' folder)
RUN npm run build

# -----------------------------------
# STAGE 2: Serve the App with Nginx
# -----------------------------------
FROM nginx:alpine

# Copy the built assets from the previous stage into Nginx's hosting folder
COPY --from=build /app/dist /usr/share/nginx/html/weather

# Expose port 80 to the outside world
EXPOSE 80

# Start Nginx when the container runs
CMD ["nginx", "-g", "daemon off;"]