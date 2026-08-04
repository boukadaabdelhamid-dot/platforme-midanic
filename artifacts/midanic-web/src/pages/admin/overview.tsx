import { useEffect, useState } from 'react';
import { adminApi, type AdminStats } from '@/lib/admin-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, Key, Ticket, TrendingUp } from 'lucide-react';
import { useGetPublicStats } from '@workspace/api-client-react';

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: publicStats } = useGetPublicStats();

  useEffect(() => {
    adminApi.getStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  const cards = stats
    ? [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
        { label: 'Total Products', value: stats.totalProducts, icon: Package, color: 'text-green-500' },
        { label: 'Active Licenses', value: stats.activeLicenses, icon: Key, color: 'text-purple-500' },
        { label: 'Open Tickets', value: stats.openTickets, icon: Ticket, color: 'text-orange-500' },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform at a glance</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {/* Admin stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats
          ? cards.map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <Icon className={`h-4 w-4 ${color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{value.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-8 w-24 animate-pulse rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Public stats */}
      {publicStats && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            Public Metrics
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Published Products', value: publicStats.totalProducts },
              { label: 'Total Clients', value: publicStats.totalClients },
              { label: 'Total Downloads', value: publicStats.totalDownloads },
              { label: 'Countries', value: publicStats.totalCountries },
            ].map(({ label, value }) => (
              <Card key={label} className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{value.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
