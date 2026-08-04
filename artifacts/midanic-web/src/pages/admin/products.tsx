import { useEffect, useState, useCallback } from 'react';
import { adminApi, type AdminProduct, type ProductInput } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EMPTY: ProductInput = {
  name: '', slug: '', description: '', shortDescription: '',
  category: '', featured: false, published: false,
  trialDays: undefined, basePrice: undefined, sortOrder: 0,
};

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [form, setForm] = useState<ProductInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listProducts();
      setProducts(data);
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setSheetOpen(true);
  };

  const openEdit = (p: AdminProduct) => {
    setEditing(p);
    setForm({
      name: p.name, slug: p.slug, description: p.description,
      shortDescription: p.shortDescription ?? '', category: p.category,
      featured: p.featured, published: p.published,
      trialDays: p.trialDays ?? undefined, basePrice: p.basePrice ?? undefined,
      sortOrder: p.sortOrder,
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug || !form.description || !form.category) {
      toast({ title: 'Validation error', description: 'Name, slug, description and category are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const updated = await adminApi.updateProduct(editing.id, form);
        setProducts((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
        toast({ title: 'Product updated' });
      } else {
        const created = await adminApi.createProduct(form);
        setProducts((prev) => [...prev, created]);
        toast({ title: 'Product created' });
      }
      setSheetOpen(false);
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminApi.deleteProduct(deleteId);
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      toast({ title: 'Product deleted' });
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const f = (key: keyof ProductInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">{products.length} products</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> New Product
        </Button>
      </div>

      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 animate-pulse rounded bg-muted" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : products.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No products yet</TableCell>
                </TableRow>
              )
              : products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                  <TableCell>{p.basePrice != null ? `${p.basePrice.toLocaleString()} DZD` : '—'}</TableCell>
                  <TableCell>
                    <Badge className={p.published ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600'}>
                      {p.published ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.featured && <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30">Featured</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Product' : 'New Product'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={f('name')} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={f('slug')} placeholder="my-product" />
              </div>
              <div className="space-y-1">
                <Label>Category *</Label>
                <Input value={form.category} onChange={f('category')} placeholder="erp / education…" />
              </div>
              <div className="space-y-1">
                <Label>Base Price (DZD)</Label>
                <Input type="number" value={form.basePrice ?? ''} onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value ? Number(e.target.value) : undefined }))} />
              </div>
              <div className="space-y-1">
                <Label>Trial Days</Label>
                <Input type="number" value={form.trialDays ?? ''} onChange={(e) => setForm((p) => ({ ...p, trialDays: e.target.value ? Number(e.target.value) : undefined }))} />
              </div>
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder ?? 0} onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Short Description</Label>
                <Input value={form.shortDescription ?? ''} onChange={f('shortDescription')} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Description *</Label>
                <Textarea rows={4} value={form.description} onChange={f('description')} />
              </div>
              <div className="flex items-center gap-3 col-span-2">
                <Switch id="published" checked={form.published} onCheckedChange={(v) => setForm((p) => ({ ...p, published: v }))} />
                <Label htmlFor="published">Published</Label>
                <Switch id="featured" checked={form.featured} onCheckedChange={(v) => setForm((p) => ({ ...p, featured: v }))} className="ml-4" />
                <Label htmlFor="featured">Featured</Label>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
