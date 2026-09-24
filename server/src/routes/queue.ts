import { Router } from "express";
import { prisma } from "../app";

const router = Router();

// Get public queue info
router.get("/:queueId", async (req, res) => {
  try {
    const queue = await prisma.queue.findUnique({
      where: { id: req.params.queueId },
      include: { business: true }
    });
    
    if (!queue) {
      return res.status(404).json({ error: "Queue not found" });
    }

    res.json({
      id: queue.id,
      name: queue.name,
      businessName: queue.business.name,
      status: queue.status,
      averageServiceTime: queue.averageServiceTime
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
