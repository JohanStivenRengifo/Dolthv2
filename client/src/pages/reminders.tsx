import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Reminder } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Reminders() {
  const { toast } = useToast();
  const { data: reminders, isLoading } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"],
  });

  const completeReminder = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/reminders/${id}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({
        title: "Reminder completed",
        description: "The reminder has been marked as completed.",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">Reminders</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reminders?.map((reminder) => (
            <TableRow key={reminder.id}>
              <TableCell>{reminder.title}</TableCell>
              <TableCell>{reminder.description}</TableCell>
              <TableCell>
                {new Date(reminder.datetime).toLocaleString()}
              </TableCell>
              <TableCell>{reminder.phone}</TableCell>
              <TableCell>
                <Badge variant={reminder.completed ? "default" : "secondary"}>
                  {reminder.completed ? "Completed" : "Active"}
                </Badge>
              </TableCell>
              <TableCell>
                {!reminder.completed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => completeReminder.mutate(reminder.id)}
                  >
                    Complete
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}