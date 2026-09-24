import { prisma } from "../app";
import { Queue, QueueEntry } from "@prisma/client";
import { io, notificationService } from "../app";

export class QueueService {
  static async getQueueWithEntries(queueId: string) {
    return prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        entries: {
          orderBy: { joinedAt: "asc" }
        }
      }
    });
  }

  static async getWaitingEntries(queueId: string) {
    return prisma.queueEntry.findMany({
      where: {
        queueId,
        status: "WAITING"
      },
      orderBy: { joinedAt: "asc" }
    });
  }

  static async calculatePosition(queueId: string, entryId: string): Promise<{ position: number, peopleAhead: number } | null> {
    const entry = await prisma.queueEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.status !== "WAITING") return null;

    const waitingEntries = await this.getWaitingEntries(queueId);
    const index = waitingEntries.findIndex(e => e.id === entryId);
    
    if (index === -1) return null;
    
    return {
      position: index + 1,
      peopleAhead: index
    };
  }

  static async broadcastQueueUpdate(queueId: string) {
    const queue = await this.getQueueWithEntries(queueId);
    if (!queue) return;

    const waiting = queue.entries.filter(e => e.status === "WAITING");
    const serving = queue.entries.find(e => e.status === "SERVING" || e.status === "CALLED");

    // Tell clients
    io.to(`queue:${queueId}`).emit("queue:update", {
      queueId,
      currentServingToken: serving ? serving.tokenNumber : null,
      waitingCount: waiting.length
    });

    // Tell admin
    io.to(`admin:queue:${queueId}`).emit("queue:update", queue);
  }

  static async joinQueue(queueId: string, phoneNumber: string) {
    // Basic transaction to ensure token number increments safely
    return prisma.$transaction(async (tx) => {
      const queue = await tx.queue.findUnique({ where: { id: queueId } });
      if (!queue) throw new Error("Queue not found");
      if (queue.status !== "ACTIVE") throw new Error("Queue is not active");

      const nextNumber = queue.currentNumber + 1;
      const tokenNumber = `${queue.prefix}${nextNumber.toString().padStart(3, '0')}`;

      // Update queue number
      await tx.queue.update({
        where: { id: queueId },
        data: { currentNumber: nextNumber }
      });

      // Create entry
      const entry = await tx.queueEntry.create({
        data: {
          queueId,
          phoneNumber,
          tokenNumber,
          status: "WAITING"
        }
      });

      return entry;
    });
  }

  static async callNext(queueId: string) {
    return prisma.$transaction(async (tx) => {
      // Find currently serving and mark as completed if any
      const currentServingList = await tx.queueEntry.findMany({
        where: { queueId, status: { in: ["SERVING", "CALLED"] } }
      });

      for (const current of currentServingList) {
        await tx.queueEntry.update({
          where: { id: current.id },
          data: { status: "COMPLETED", completedAt: new Date() }
        });
      }

      // Find next waiting
      const nextEntry = await tx.queueEntry.findFirst({
        where: { queueId, status: "WAITING" },
        orderBy: { joinedAt: "asc" }
      });

      if (!nextEntry) {
        return null; // No one waiting
      }

      const calledEntry = await tx.queueEntry.update({
        where: { id: nextEntry.id },
        data: { status: "CALLED", calledAt: new Date() }
      });

      return calledEntry;
    });
  }
}
