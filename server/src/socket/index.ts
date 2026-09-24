import { Server, Socket } from "socket.io";

export function setupSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Customer joins a queue room
    socket.on("joinQueue", (queueId: string) => {
      socket.join(`queue:${queueId}`);
      console.log(`Socket ${socket.id} joined room queue:${queueId}`);
    });

    // Admin joins an admin room for a queue (could be separate or same)
    socket.on("joinAdminQueue", (queueId: string) => {
      socket.join(`admin:queue:${queueId}`);
      console.log(`Admin Socket ${socket.id} joined room admin:queue:${queueId}`);
    });

    socket.on("leaveQueue", (queueId: string) => {
      socket.leave(`queue:${queueId}`);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
