import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, QrCode, Settings2, LogOut, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchDashboard,
  createBusiness,
  createQueue,
  type Business,
} from "@/lib/queueService";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [queueName, setQueueName] = useState("");
  const [queuePrefix, setQueuePrefix] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDashboard = async () => {
    try {
      const data = await fetchDashboard();
      setBusinesses(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let targetBusinessId = businesses.length > 0 ? businesses[0].id : null;

      // If no business exists, create a default one for this user
      if (!targetBusinessId) {
        const business = await createBusiness(
          "My Business",
          "my-business-" + Date.now()
        );
        targetBusinessId = business.id;
      }

      await createQueue(targetBusinessId, queueName, queuePrefix, 5);

      toast.success("Queue created successfully!");
      setIsDialogOpen(false);
      setQueueName("");
      setQueuePrefix("");
      loadDashboard();
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

  const allQueues = businesses.flatMap(b => b.queues ?? []);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top Nav */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">QueuePro</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-8 space-y-8">
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
                      onChange={(e) => setQueuePrefix(e.target.value.toUpperCase())}
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

        {allQueues.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent text-center py-16">
            <CardContent>
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <p className="text-muted-foreground">No queues found. Create one to get started!</p>
                <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                  Create Your First Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {businesses.map((business) =>
              (business.queues?.length ?? 0) > 0 && (
                <div key={business.id} className="space-y-4">
                  <h2 className="text-2xl font-semibold">{business.name}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {business.queues?.map((queue) => (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
