export interface INotificationService {
  sendTurnNotification(phoneNumber: string, message: string): Promise<void>;
}

export class NotificationService implements INotificationService {
  async sendTurnNotification(phoneNumber: string, message: string): Promise<void> {
    // Mock implementation for development
    console.log(`\n======================================================`);
    console.log(`[NOTIFICATION SERVICE] Sending SMS to ${phoneNumber}`);
    console.log(`Message: ${message}`);
    console.log(`======================================================\n`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
