import express, { Express } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import path from "path";
import fs from "fs";
import https from "https";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import serverRoutes from "./modules/server/serverRoutes";
import authRoutes from "./modules/users/authRoutes";
import userRoutes from "./modules/users/userRoutes";
import friendsRoutes from "./modules/users/friendsRoutes";
import ingredientRoutes from "./modules/ingredients/ingredientRoutes";
import recognitionRoutes from "./modules/ingredients/recognitionRoutes";
import recipeRoutes from "./modules/recipes/recipeRoutes";
import fridgeRoutes from "./modules/fridge/fridgeRoutes";
import groceriesRoutes from "./modules/fridge/groceriesRoutes";
import cookbookRoutes from "./modules/cookbook/cookbookRoutes";
import sharedRecipeRoutes from "./modules/cookbook/sharedRecipeRoutes";
import notificationRoutes from "./modules/notifications/notificationRoutes";
import analyticsRoutes from "./modules/analytics/analyticsRoutes";
import { specs, swaggerUI } from "./swagger";

const app = express();

dotenv.config();

// Ensure the uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(uploadDir));

// Connect to MongoDB
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => {
  console.log("Connected to Database");  
});

// Middleware setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

// Serve the API routes
app.use("/", serverRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/users/friends", friendsRoutes);
app.use("/api/ingredients", ingredientRoutes);
app.use("/api/ingredients/recognition", recognitionRoutes);
app.use("/api/fridge", fridgeRoutes);
app.use("/api/fridge/:fridgeId/groceries", groceriesRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/cookbook",cookbookRoutes);
app.use("/api/cookbook", sharedRecipeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);

// Serve the API documentation
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

// --- Socket.IO Setup ---
let io: SocketIOServer;
export function attachSocket(server: https.Server) {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join", (userId: string) => {
      socket.join(userId);
      console.log(`User ${userId} joined their notification room`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}

export { io };

// --- App Initialization ---
const initApp = () => {
  return new Promise<Express>(async (resolve, reject) => {
    if (process.env.DB_CONNECTION == undefined) {
      reject("DB_CONNECTION is not defined");
    } else {
      await mongoose.connect(process.env.DB_CONNECTION);
      resolve(app);
    }
  });
};

export default initApp;