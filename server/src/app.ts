import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { setupSocket } from "./socket";
import queueRoutes from "./routes/queue";
import adminRoutes from "./routes/admin";
import customerRoutes from "./routes/customer";
import { NotificationService } from "./notifications";

export const prisma = new PrismaClient();
export const notificationService = new NotificationService();

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*", // For development
    methods: ["GET", "POST"]
  }
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/queues", queueRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/customer", customerRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Setup WebSockets
setupSocket(io);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
