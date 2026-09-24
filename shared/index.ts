export type QueueEntryStatus =
  | "WAITING"
  | "CALLED"
  | "SERVING"
  | "COMPLETED"
  | "SKIPPED"
  | "CANCELLED";

export type QueueStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

export interface Business {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Queue {
  id: string;
  businessId: string;
  name: string;
  prefix: string;
  currentNumber: number;
  status: QueueStatus;
  averageServiceTime: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

export interface QueueEntry {
  id: string;
  queueId: string;
  tokenNumber: string;
  phoneNumber: string;
  status: QueueEntryStatus;
  joinedAt: Date;
  calledAt: Date | null;
  completedAt: Date | null;
}

// DTOs
export interface JoinQueueRequest {
  phoneNumber: string;
}

export interface JoinQueueResponse {
  entry: QueueEntry;
  position: number;
  estimatedWait: number; // in minutes
}

export interface QueueStateUpdate {
  queueId: string;
  currentServing: string | null;
  waitingCount: number;
  entries: QueueEntry[]; // for admin mainly, but simplified for clients
}

// Client specific queue view
export interface ClientQueueState {
  queueId: string;
  currentServingToken: string | null;
  peopleAhead: number;
  status: QueueEntryStatus;
}
