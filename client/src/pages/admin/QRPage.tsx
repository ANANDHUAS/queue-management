import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, Printer } from "lucide-react";
import { toast } from "sonner";

export default function QRPage() {
  const { queueId } = useParams();
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/admin/queues/${queueId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setQueue(data);
      })
      .catch(err => toast.error("Failed to load queue"))
      .finally(() => setLoading(false));
  }, [queueId]);

  if (loading || !queue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const joinUrl = `http://localhost:5173/join/${queueId}`;

  // Note: For a real app, use a QR code library like 'qrcode.react'
  // Here we'll use an API service for rapid prototyping
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;

  return (
    <div className="min-h-screen bg-muted/30 p-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-md mb-4">
        <Link to="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md shadow-xl text-center">
        <CardHeader>
          <CardTitle className="text-2xl">{queue.name}</CardTitle>
          <CardDescription>Scan to join the queue</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="bg-white p-4 rounded-xl shadow-inner mb-6">
            <img src={qrUrl} alt="QR Code" className="w-64 h-64" />
          </div>

          <div className="bg-muted p-3 rounded-md w-full mb-6 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Direct Link</span>
            <code className="text-sm select-all">{joinUrl}</code>
          </div>

          <div className="flex gap-4 w-full">
            <Button variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button className="flex-1">
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
