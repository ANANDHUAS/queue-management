import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Users, ArrowRight } from "lucide-react";
import { socketService } from "@/lib/socket";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function TrackingPage() {
  const { entryId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/customer/entry/${entryId}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const socket = socketService.connect();
    
    // We need to join the queue room once we know the queueId
    if (data?.entry?.queueId) {
      socket.emit("joinQueue", data.entry.queueId);
    }

    socket.on("queue:update", (update) => {
      // Refresh data when queue updates
      fetchData();
    });

    return () => {
      if (data?.entry?.queueId) {
        socket.emit("leaveQueue", data.entry.queueId);
      }
      socket.off("queue:update");
    };
  }, [entryId, data?.entry?.queueId]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { entry, peopleAhead, estimatedWait, currentServingToken, businessName, queueName } = data;

  const isCalled = entry.status === "CALLED" || entry.status === "SERVING";
  const isCompleted = entry.status === "COMPLETED";
  const isSkipped = entry.status === "SKIPPED";

  if (isCompleted || isSkipped) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md glass text-center py-12">
          <CardTitle className="text-2xl mb-2">
            {isCompleted ? "Service Completed" : "Turn Skipped"}
          </CardTitle>
          <p className="text-muted-foreground">
            {isCompleted ? "Thank you for visiting!" : "You missed your turn."}
          </p>
        </Card>
      </div>
    );
  }

  if (isCalled) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <Card className="w-full max-w-md border-none bg-background/95 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-500">
          <CardContent className="pt-12 pb-12 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
              <ArrowRight className="w-12 h-12" />
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-2">It's your turn!</h1>
            <p className="text-xl text-muted-foreground mb-8">Please proceed to the counter</p>
            
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 w-full">
              <p className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mb-1">Your Token</p>
              <p className="text-6xl font-black text-primary">{entry.tokenNumber}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // WAITING STATE
  const progressValue = Math.max(0, 100 - (peopleAhead * 10)); // Arbitrary progress calculation for demo

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-md mx-auto space-y-6 pt-4">
        
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{businessName}</h1>
          <p className="text-muted-foreground">{queueName}</p>
        </div>

        <Card className="glass border-primary/10 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary"></div>
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mb-2">Your Token</p>
            <div className="text-7xl font-black tracking-tighter text-foreground mb-4">
              {entry.tokenNumber}
            </div>
            <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20">
              <Clock className="w-3 h-3 mr-1.5" />
              Waiting
            </Badge>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="glass shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <Users className="w-5 h-5 text-muted-foreground mb-2" />
              <p className="text-3xl font-bold">{peopleAhead}</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase font-semibold">People Ahead</p>
            </CardContent>
          </Card>

          <Card className="glass shadow-sm">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <Clock className="w-5 h-5 text-muted-foreground mb-2" />
              <p className="text-3xl font-bold">~{estimatedWait}m</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase font-semibold">Estimated Wait</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass bg-card/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Now Serving</p>
              <p className="text-xl font-bold">{currentServingToken || "None"}</p>
            </div>
            <div className="w-32">
               <Progress value={progressValue} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8">
          You will receive a notification when your turn is approaching.
        </p>

      </div>
    </div>
  );
}
