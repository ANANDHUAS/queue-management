import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function JoinPage() {
  const { queueId } = useParams();
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [queueInfo, setQueueInfo] = useState<any>(null);

  useEffect(() => {
    // Fetch queue info
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/queues/${queueId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setQueueInfo(data);
      })
      .catch(err => {
        toast.error("Failed to load queue details");
      });
  }, [queueId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < 5) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/customer/${queueId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await res.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      toast.success("Joined queue successfully!");
      navigate(`/queue/${data.entry.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to join queue");
    } finally {
      setLoading(false);
    }
  };

  if (!queueInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 flex items-center justify-center">
      <Card className="w-full max-w-md glass border-primary/10 shadow-2xl shadow-primary/5">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 p-3 rounded-2xl mb-4 w-16 h-16 flex items-center justify-center text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{queueInfo.businessName}</CardTitle>
          <CardDescription className="text-base mt-2">
            Join the queue for <span className="font-semibold text-foreground">{queueInfo.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                type="tel" 
                placeholder="Enter your mobile number"
                className="text-lg py-6 bg-background/50 focus-visible:ring-primary/50"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll notify you when it's your turn. No spam.
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold rounded-xl bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Join Queue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
