import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowRight, SkipForward, CheckCircle2, Megaphone, ArrowLeft, MoreHorizontal, PhoneCall } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  fetchQueueWithEntries,
  callNext,
  skipCurrent,
  completeCurrent,
  callSpecific,
  type Queue,
} from "@/lib/queueService";

export default function QueueManagement() {
  const { queueId } = useParams<{ queueId: string }>();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadQueue = async () => {
    if (!queueId) return;
    try {
      const data = await fetchQueueWithEntries(queueId);
      if (!data) throw new Error("Queue not found");
      setQueue(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!queueId) return;
    loadQueue();

    // Subscribe to real-time changes on queue_entries for this queue
    // This completely replaces Socket.io
    const channel = supabase
      .channel(`admin-queue-${queueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_entries",
          filter: `queue_id=eq.${queueId}`,
        },
        () => {
          // Any change to entries → reload the queue
          loadQueue();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [queueId]);

  const performAction = async (action: string) => {
    if (!queueId) return;
    setActionLoading(action);
    try {
      if (action === "next") {
        const called = await callNext(queueId);
        if (called) {
          toast.success(`Called ${called.token_number}`);
        } else {
          toast.info("Queue is empty");
        }
      } else if (action === "skip") {
        await skipCurrent(queueId);
        toast.success("Entry skipped");
      } else if (action === "complete") {
        await completeCurrent(queueId);
        toast.success("Entry completed");
      } else if (action === "recall") {
        // Recall: just show the current token again via a toast
        const current = queue?.queue_entries?.find(
          (e) => e.status === "CALLED" || e.status === "SERVING"
        );
        if (current) {
          toast.info(`RECALL: Token ${current.token_number} — please proceed to counter!`, {
            duration: 5000,
          });
        }
      }
      // Realtime will trigger loadQueue() automatically
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

  const entries = queue.queue_entries ?? [];
  const waiting = entries.filter((e) => e.status === "WAITING");
  const current = entries.find((e) => e.status === "CALLED" || e.status === "SERVING");
  const history = entries
    .filter((e) => ["COMPLETED", "SKIPPED"].includes(e.status))
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{queue.name}</h1>
            <p className="text-muted-foreground">Live updates via Supabase Realtime</p>
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
                  {current ? current.token_number : "--"}
                </span>
              </div>

              <div className="flex gap-4 w-full max-w-md">
                <Button
                  size="lg"
                  className="flex-1 h-16 text-lg"
                  onClick={() => performAction("next")}
                  disabled={!!actionLoading || waiting.length === 0}
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
            <CardContent className="p-0 overflow-hidden">
              <Table className="table-fixed w-full text-sm">
                <colgroup>
                  <col className="w-8" />
                  <col className="w-auto" />
                  <col className="w-14" />
                  <col className="w-8" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-2 py-2">#</TableHead>
                    <TableHead className="px-2 py-2">Token</TableHead>
                    <TableHead className="px-2 py-2">Pax</TableHead>
                    <TableHead className="px-1 py-2"></TableHead>
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
                    waiting.map((entry, idx) => (
                      <TableRow key={entry.id}>
                        <TableCell className="px-2 py-2 font-medium text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="px-2 py-2 font-bold truncate">{entry.token_number}</TableCell>
                        <TableCell className="px-2 py-2">
                          <Badge variant="outline" className="gap-1 text-xs px-1">
                            👥 {entry.party_size ?? 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-1 py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                disabled={!!actionLoading}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={async () => {
                                  setActionLoading(`call-${entry.id}`);
                                  try {
                                    await callSpecific(entry.id);
                                    toast.success(`Called ${entry.token_number} directly`);
                                  } catch (err: any) {
                                    toast.error(err.message || "Failed to call");
                                  } finally {
                                    setActionLoading(null);
                                  }
                                }}
                              >
                                {actionLoading === `call-${entry.id}` ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <PhoneCall className="h-4 w-4 text-primary" />
                                )}
                                Call Now
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
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
                  history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-bold">{entry.token_number}</TableCell>
                      <TableCell>
                        <Badge variant={entry.status === "COMPLETED" ? "default" : "destructive"}>
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.completed_at ? new Date(entry.completed_at).toLocaleTimeString() : "--"}
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
