import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Message } from "@shared/schema";

export default function Messages() {
  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">Messages</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Phone</TableHead>
            <TableHead>Content</TableHead>
            <TableHead>Sentiment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages?.map((message) => (
            <TableRow key={message.id}>
              <TableCell>{message.phone}</TableCell>
              <TableCell>{message.content}</TableCell>
              <TableCell>{message.sentiment}</TableCell>
              <TableCell>
                <Badge variant={message.processed ? "default" : "secondary"}>
                  {message.processed ? "Processed" : "Pending"}
                </Badge>
              </TableCell>
              <TableCell>
                {message.createdAt ? new Date(message.createdAt).toLocaleString() : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}