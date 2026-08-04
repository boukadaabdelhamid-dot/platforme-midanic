import { useEffect, useState, useCallback } from 'react';
import { adminApi, type AdminLicense, type AdminSubscription } from '@/lib/admin-api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  suspended: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-gray-100 text-gray-600',
  trial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function AdminLicenses() {
  const [licenses, setLicenses] = useState<AdminLicense[]>([]);
  const [lTotal, setLTotal] = useState(0);
  const [lPage, setLPage] = useState(1);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [sTotal, setSTotal] = useState(0);
  const [sPage, setSPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listLicenses({ page: lPage, limit: 20 });
      setLicenses(res.licenses);
      setLTotal(res.total);
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [lPage, toast]);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await adminApi.listSubscriptions({ page: sPage, limit: 20 });
      setSubscriptions(res.subscriptions);
      setSTotal(res.total);
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    }
  }, [sPage, toast]);

  useEffect(() => { fetchLicenses(); }, [fetchLicenses]);
  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Licenses & Subscriptions</h1>
        <p className="text-muted-foreground text-sm mt-1">Read-only view of all licenses and subscriptions</p>
      </div>

      <Tabs defaultValue="licenses">
        <TabsList>
          <TabsTrigger value="licenses">Licenses ({lTotal})</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions ({sTotal})</TabsTrigger>
        </TabsList>

        <TabsContent value="licenses" className="mt-4 space-y-3">
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Key</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                      ))}</TableRow>
                    ))
                  : licenses.length === 0
                  ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No licenses</TableCell></TableRow>
                  : licenses.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{l.licenseKey}</TableCell>
                      <TableCell className="text-sm">{l.userEmail ?? l.userId}</TableCell>
                      <TableCell className="text-sm">{l.productName ?? l.productId}</TableCell>
                      <TableCell><Badge variant="outline">{l.type}</Badge></TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[l.status] ?? ''}>{l.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <Pagination total={lTotal} page={lPage} onPage={setLPage} />
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4 space-y-3">
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period Start</TableHead>
                  <TableHead>Period End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.length === 0
                  ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No subscriptions</TableCell></TableRow>
                  : subscriptions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm">{s.userEmail ?? s.userId}</TableCell>
                      <TableCell className="text-sm">{s.productName ?? s.productId}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[s.status] ?? ''}>{s.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.currentPeriodStart ? new Date(s.currentPeriodStart).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <Pagination total={sTotal} page={sPage} onPage={setSPage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Pagination({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / 20);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>Page {page} of {totalPages}</span>
      <div className="flex gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => onPage(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
