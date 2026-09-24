import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, QrCode, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [queueName, setQueueName] = useState("");
  const [queuePrefix, setQueuePrefix] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDashboard = () => {
    // Note: In a production app, we would use an environment variable (like import.meta.env.VITE_API_URL)
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/admin/dashboard`)
      .then(res => res.json())
      .then(data => setBusinesses(data))
      .catch(err => toast.error("Failed to load dashboard"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let targetBusinessId = businesses.length > 0 ? businesses[0].id : null;

      // If no business exists, create a default one first
      if (!targetBusinessId) {
        const busRes = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/admin/businesses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "My Business", slug: "my-business-" + Date.now() }),
        });
        if (!busRes.ok) throw new Error("Failed to create business");
        const busData = await busRes.json();
        targetBusinessId = busData.id;
      }

      // Create the queue
      const queueRes = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/admin/queues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: targetBusinessId,
          name: queueName,
          prefix: queuePrefix,
          averageServiceTime: 5,
        }),
      });

      if (!queueRes.ok) throw new Error("Failed to create queue");
      
      toast.success("Queue created successfully!");
      setIsDialogOpen(false);
      setQueueName("");
      setQueuePrefix("");
      fetchDashboard();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Queue Management</h1>
            <p className="text-muted-foreground mt-1">Manage your active queues.</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New Queue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateQueue}>
                <DialogHeader>
                  <DialogTitle>Create New Queue</DialogTitle>
                  <DialogDescription>
                    Add a new queue to start serving customers.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g. Support Desk"
                      value={queueName}
                      onChange={(e) => setQueueName(e.target.value)}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="prefix" className="text-right">
                      Prefix
                    </Label>
                    <Input
                      id="prefix"
                      placeholder="e.g. SUP"
                      value={queuePrefix}
                      onChange={(e) => setQueuePrefix(e.target.value)}
                      className="col-span-3"
                      required
                      maxLength={5}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Queue
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {businesses.length === 0 || businesses.every(b => b.queues.length === 0) ? (
          <Card className="border-dashed border-2 bg-transparent text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">No queues found. Create one to get started!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {businesses.map((business) => (
              business.queues.length > 0 && (
                <div key={business.id} className="space-y-4">
                  <h2 className="text-2xl font-semibold flex items-center">
                    {business.name}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {business.queues.map((queue: any) => (
                      <Card key={queue.id} className="hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{queue.name}</CardTitle>
                          <CardDescription>Prefix: {queue.prefix}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 mt-2">
                            <Link to={`/admin/queues/${queue.id}`} className="flex-1">
                              <Button className="w-full" variant="secondary">
                                <Settings2 className="w-4 h-4 mr-2" />
                                Manage
                              </Button>
                            </Link>
                            <Link to={`/admin/queues/${queue.id}/qr`}>
                              <Button variant="outline" size="icon">
                                <QrCode className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
