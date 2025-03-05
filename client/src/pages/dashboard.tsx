import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { Message, Reminder, Analytics } from "@shared/schema";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const { data: messages } = useQuery<Message[]>({ 
    queryKey: ["/api/messages"]
  });

  const { data: reminders } = useQuery<Reminder[]>({
    queryKey: ["/api/reminders"]
  });

  const { data: analytics } = useQuery<Analytics[]>({
    queryKey: ["/api/analytics"]
  });

  const activeReminders = reminders?.filter(r => !r.completed) || [];
  const sharedReminders = reminders?.filter(r => r.shared) || [];

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Mensajes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{messages?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recordatorios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {activeReminders.length}
            </p>
            <p className="text-sm text-muted-foreground">
              {sharedReminders.length} compartidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recordatorios Completados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {reminders?.filter(r => r.completed).length || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle>Actividad</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics && analytics.length > 0 && (
              <Line
                data={{
                  labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                  datasets: [
                    {
                      label: 'Mensajes',
                      data: analytics?.[0]?.commonDays?.map((_, i) => 
                        messages?.filter(m => 
                          m.createdAt && new Date(m.createdAt).getDay() === i
                        ).length || 0
                      ) || [],
                      borderColor: 'rgb(53, 162, 235)',
                      backgroundColor: 'rgba(53, 162, 235, 0.5)',
                    }
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Actividad semanal'
                    },
                  },
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card className="col-span-full md:col-span-2">
          <CardHeader>
            <CardTitle>Próximos Recordatorios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeReminders.slice(0, 5).map(reminder => (
                <div key={reminder.id} className="flex items-center gap-4 p-2 rounded-lg bg-accent/10">
                  <div className="flex-1">
                    <h3 className="font-semibold">{reminder.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(reminder.datetime).toLocaleString()}
                    </p>
                  </div>
                  {reminder.shared && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      Compartido 👥
                    </span>
                  )}
                  {reminder.recurring && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      {reminder.frequency} 🔄
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}