import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { fetchQueueInfo, joinQueue } from "@/lib/queueService";

export default function JoinPage() {
  const { queueId } = useParams<{ queueId: string }>();
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [partySize, setPartySize] = useState<string>("1");
  const [customPartySize, setCustomPartySize] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [queueInfo, setQueueInfo] = useState<{ id: string; name: string; businessName: string } | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);

  const isCustom = partySize === "10+";
  const effectivePartySize = isCustom ? parseInt(customPartySize || "0") : parseInt(partySize);

  useEffect(() => {
    if (!queueId) return;
    fetchQueueInfo(queueId)
      .then((info) => {
        if (!info) throw new Error("Queue not found");
        setQueueInfo(info);
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load queue details");
      })
      .finally(() => setInfoLoading(false));
  }, [queueId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueId || phoneNumber.length < 5) {
      toast.error("Please enter a valid phone number");
      return;
    }
    if (isCustom && (isNaN(effectivePartySize) || effectivePartySize < 1)) {
      toast.error("Please enter a valid number of persons");
      return;
    }

    setLoading(true);
    try {
      const entry = await joinQueue(queueId, phoneNumber, effectivePartySize);
      toast.success("Joined queue successfully!");
      navigate(`/queue/${entry.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to join queue");
    } finally {
      setLoading(false);
    }
  };

  if (infoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!queueInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">This queue does not exist or is no longer active.</p>
          </CardContent>
        </Card>
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

            <div className="space-y-2">
              <Label htmlFor="partySize" className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Number of Persons
              </Label>
              <select
                id="partySize"
                value={partySize}
                onChange={e => setPartySize(e.target.value)}
                className="w-full h-12 px-3 rounded-md border border-input bg-background/50 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <option key={n} value={String(n)}>{n} {n === 1 ? "person" : "persons"}</option>
                ))}
                <option value="10+">10+ persons</option>
              </select>

              {isCustom && (
                <Input
                  id="customPartySize"
                  type="number"
                  min="11"
                  placeholder="Enter exact number (e.g. 15)"
                  className="text-base py-5 bg-background/50 focus-visible:ring-primary/50"
                  value={customPartySize}
                  onChange={e => setCustomPartySize(e.target.value)}
                />
              )}
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
