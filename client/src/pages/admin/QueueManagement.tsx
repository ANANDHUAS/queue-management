import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, SkipForward, CheckCircle2, Megaphone, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { socketService } from "@/lib/socket";

export default function QueueManagement() {
  const { queueId } = useParams();
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/admin/queues/${queueId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQueue(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    
    const socket = socketService.connect();
    socket.emit("joinAdminQueue", queueId);

    socket.on("queue:update", (updatedQueue) => {
      // For simplicity, we just trigger a refetch, but we could also use the payload directly
      fetchQueue();
    });

    return () => {
      socket.emit("leaveQueue", `admin:queue:${queueId}`);
      socket.off("queue:update");
    };
  }, [queueId]);

  const performAction = async (action: string) => {
    setActionLoading(action);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/admin/queues/${queueId}/${action}`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      if (action === "next" && data.calledEntry) {
        toast.success(`Called ${data.calledEntry.tokenNumber}`);
      } else if (action === "next") {
        toast.info("Queue is empty");
      } else {
        toast.success(`Action '${action}' successful`);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || !queue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const waiting = queue.entries.filter((e: any) => e.status === "WAITING");
  const current = queue.entries.find((e: any) => e.status === "CALLED" || e.status === "SERVING");
  const history = queue.entries.filter((e: any) => ["COMPLETED", "SKIPPED"].includes(e.status)).reverse().slice(0, 5);

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{queue.name}</h1>
            <p className="text-muted-foreground">Manage this queue</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Control Panel */}
          <Card className="lg:col-span-2 shadow-sm border-primary/20">
            <CardHeader className="bg-primary/5 pb-4 border-b">
              <CardTitle className="text-xl">Now Serving</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 text-center flex flex-col items-center">
              <div className="w-48 h-32 bg-background border-2 rounded-2xl flex items-center justify-center shadow-inner mb-8">
                <span className="text-6xl font-black text-primary">
                  {current ? current.tokenNumber : "--"}
                </span>
              </div>
              
              <div className="flex gap-4 w-full max-w-md">
                <Button 
                  size="lg" 
                  className="flex-1 h-16 text-lg" 
                  onClick={() => performAction("next")}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "next" ? <Loader2 className="mr-2 animate-spin w-5 h-5" /> : <ArrowRight className="mr-2 w-5 h-5" />}
                  Call Next
                </Button>
              </div>

              {current && (
                <div className="flex gap-3 mt-6">
                  <Button variant="outline" onClick={() => performAction("recall")} disabled={!!actionLoading}>
                    <Megaphone className="mr-2 w-4 h-4" /> Recall
                  </Button>
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => performAction("skip")} disabled={!!actionLoading}>
                    <SkipForward className="mr-2 w-4 h-4" /> Skip
                  </Button>
                  <Button variant="outline" className="text-green-600 hover:bg-green-600/10" onClick={() => performAction("complete")} disabled={!!actionLoading}>
                    <CheckCircle2 className="mr-2 w-4 h-4" /> Complete
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Waiting List */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex justify-between items-center">
                Waiting List
                <Badge variant="secondary">{waiting.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pos</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waiting.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No one is waiting
                      </TableCell>
                    </TableRow>
                  ) : (
                    waiting.map((entry: any, idx: number) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-bold">{entry.tokenNumber}</TableCell>
                        <TableCell>{entry.phoneNumber.replace(/.(?=.{4})/g, '*')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg">Recent History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No history yet
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-bold">{entry.tokenNumber}</TableCell>
                      <TableCell>
                        <Badge variant={entry.status === "COMPLETED" ? "default" : "destructive"}>
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.completedAt ? new Date(entry.completedAt).toLocaleTimeString() : "--"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
