import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { fetchQueueWithEntries, type Queue } from "@/lib/queueService";

export default function QRPage() {
  const { queueId } = useParams();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!queueId) return;
    fetchQueueWithEntries(queueId)
      .then((data) => {
        if (!data) throw new Error("Queue not found");
        setQueue(data);
      })
      .catch(() => toast.error("Failed to load queue"))
      .finally(() => setLoading(false));
  }, [queueId]);

  if (loading || !queue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Use production URL when deployed, fallback to current origin for local dev
  const baseUrl = window.location.origin;
  const joinUrl = `${baseUrl}/join/${queueId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `qr-${queue.name.replace(/\s+/g, "-")}.png`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

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
            <img ref={imgRef} src={qrUrl} alt="QR Code" className="w-64 h-64" />
          </div>

          <div className="bg-muted p-3 rounded-md w-full mb-6 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Direct Link</span>
            <code className="text-sm select-all break-all">{joinUrl}</code>
          </div>

          <div className="flex gap-4 w-full">
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button className="flex-1" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
