import { Router } from "express";
import { QueueService } from "../services/QueueService";
import { prisma } from "../app";
import { io } from "../app";

const router = Router();

// Join queue
router.post("/:queueId/join", async (req, res) => {
  try {
    const { queueId } = req.params;
    const { phoneNumber } = req.body;

    if (!phoneNumber || phoneNumber.length < 5) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    const entry = await QueueService.joinQueue(queueId, phoneNumber);
    
    // Broadcast update
    await QueueService.broadcastQueueUpdate(queueId);

    const posData = await QueueService.calculatePosition(queueId, entry.id);
    const queue = await prisma.queue.findUnique({ where: { id: queueId } });

    res.json({
      entry,
      position: posData?.position || 0,
      estimatedWait: (posData?.peopleAhead || 0) * (queue?.averageServiceTime || 5)
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to join queue" });
  }
});

// Get entry status
router.get("/entry/:entryId", async (req, res) => {
  try {
    const { entryId } = req.params;
    const entry = await prisma.queueEntry.findUnique({
      where: { id: entryId },
      include: { queue: { include: { business: true } } }
    });

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }

    const posData = await QueueService.calculatePosition(entry.queueId, entry.id);
    
    // Find currently serving
    const serving = await prisma.queueEntry.findFirst({
      where: { queueId: entry.queueId, status: { in: ["SERVING", "CALLED"] } },
      orderBy: { calledAt: "desc" }
    });

    res.json({
      entry,
      position: posData?.position || 0,
      peopleAhead: posData?.peopleAhead || 0,
      estimatedWait: (posData?.peopleAhead || 0) * entry.queue.averageServiceTime,
      currentServingToken: serving ? serving.tokenNumber : null,
      businessName: entry.queue.business.name,
      queueName: entry.queue.name
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
