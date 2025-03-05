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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Calendar } from "@shared/schema";
import { z } from "zod";

const connectCalendarSchema = z.object({
  phone: z.string().min(1, "Teléfono es requerido"),
  type: z.string().min(1, "Tipo de calendario es requerido"),
  name: z.string().min(1, "Nombre es requerido"),
});

type ConnectCalendarForm = z.infer<typeof connectCalendarSchema>;

export default function Calendars() {
  const { toast } = useToast();
  const form = useForm<ConnectCalendarForm>({
    resolver: zodResolver(connectCalendarSchema),
  });

  const { data: calendars, isLoading: loadingCalendars } = useQuery<Calendar[]>({
    queryKey: ["/api/calendars"],
  });

  const { data: providers, isLoading: loadingProviders } = useQuery<
    { id: string; name: string }[]
  >({
    queryKey: ["/api/calendar-providers"],
  });

  const connectCalendar = useMutation({
    mutationFn: async (data: ConnectCalendarForm) => {
      await apiRequest("POST", "/api/calendars", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendars"] });
      toast({
        title: "Calendario conectado",
        description: "El calendario ha sido conectado exitosamente.",
      });
    },
  });

  if (loadingCalendars || loadingProviders) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Calendarios</h1>

        <Dialog>
          <DialogTrigger asChild>
            <Button>Conectar Calendario</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conectar Nuevo Calendario</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) => connectCalendar.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Calendario</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {providers?.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Mi Calendario" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={connectCalendar.isPending}
                >
                  {connectCalendar.isPending ? "Conectando..." : "Conectar"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Última Sincronización</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calendars?.map((calendar) => (
            <TableRow key={calendar.id}>
              <TableCell>{calendar.name}</TableCell>
              <TableCell>{calendar.type}</TableCell>
              <TableCell>{calendar.phone}</TableCell>
              <TableCell>
                {calendar.expiresAt && new Date(calendar.expiresAt) > new Date()
                  ? "Conectado"
                  : "Desconectado"}
              </TableCell>
              <TableCell>
                {calendar.createdAt
                  ? new Date(calendar.createdAt).toLocaleString()
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
