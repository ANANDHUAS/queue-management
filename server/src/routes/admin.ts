import { Router } from "express";
import { QueueService } from "../services/QueueService";
import { prisma } from "../app";
import { notificationService } from "../app";

const router = Router();

// For prototype, we skip real auth middleware and just provide open endpoints.
// In a real app, a middleware to verify JWT or session would go here.

// Get all businesses/queues
router.get("/dashboard", async (req, res) => {
  try {
    const businesses = await prisma.business.findMany({
      include: {
        queues: true
      }
    });
    res.json(businesses);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get specific queue for management
router.get("/queues/:queueId", async (req, res) => {
  try {
    const queue = await QueueService.getQueueWithEntries(req.params.queueId);
    if (!queue) {
      return res.status(404).json({ error: "Queue not found" });
    }
    res.json(queue);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create Business
router.post("/businesses", async (req, res) => {
  try {
    const { name, slug } = req.body;
    const business = await prisma.business.create({
      data: { name, slug }
    });
    res.json(business);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Create Queue
router.post("/queues", async (req, res) => {
  try {
    const { businessId, name, prefix, averageServiceTime } = req.body;
    const queue = await prisma.queue.create({
      data: { businessId, name, prefix, averageServiceTime }
    });
    res.json(queue);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Call Next
router.post("/queues/:queueId/next", async (req, res) => {
  try {
    const { queueId } = req.params;
    const calledEntry = await QueueService.callNext(queueId);
    
    await QueueService.broadcastQueueUpdate(queueId);

    if (calledEntry) {
      await notificationService.sendTurnNotification(
        calledEntry.phoneNumber,
        `🎉 It's your turn! Token ${calledEntry.tokenNumber}. Please proceed to the counter.`
      );
    }

    res.json({ success: true, calledEntry });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Recall (just re-send notification)
router.post("/queues/:queueId/recall", async (req, res) => {
  try {
    const { queueId } = req.params;
    const current = await prisma.queueEntry.findFirst({
      where: { queueId, status: { in: ["CALLED", "SERVING"] } },
      orderBy: { calledAt: "desc" }
    });

    if (current) {
      await notificationService.sendTurnNotification(
        current.phoneNumber,
        `⚠️ RECALL: It's your turn! Token ${current.tokenNumber}. Please proceed to the counter immediately.`
      );
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Skip current
router.post("/queues/:queueId/skip", async (req, res) => {
  try {
    const { queueId } = req.params;
    const current = await prisma.queueEntry.findFirst({
      where: { queueId, status: { in: ["CALLED", "SERVING"] } },
      orderBy: { calledAt: "desc" }
    });

    if (current) {
      await prisma.queueEntry.update({
        where: { id: current.id },
        data: { status: "SKIPPED", completedAt: new Date() }
      });
      await QueueService.broadcastQueueUpdate(queueId);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Complete current
router.post("/queues/:queueId/complete", async (req, res) => {
  try {
    const { queueId } = req.params;
    const current = await prisma.queueEntry.findFirst({
      where: { queueId, status: { in: ["CALLED", "SERVING"] } },
      orderBy: { calledAt: "desc" }
    });

    if (current) {
      await prisma.queueEntry.update({
        where: { id: current.id },
        data: { status: "COMPLETED", completedAt: new Date() }
      });
      await QueueService.broadcastQueueUpdate(queueId);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
