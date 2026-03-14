import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, Pencil, Trash2, CalendarRange } from 'lucide-react';

interface Season {
  id: string;
  season_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export default function SeasonSettings() {
  const { toast } = useToast();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Season | null>(null);
  const [form, setForm] = useState({ season_name: '', start_date: '', end_date: '', is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchSeasons = async () => {
    const { data } = await supabase.from('season_settings').select('*').order('start_date', { ascending: false });
    if (data) setSeasons(data as Season[]);
    setLoading(false);
  };

  useEffect(() => { fetchSeasons(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ season_name: '', start_date: '', end_date: '', is_active: true });
    setDialogOpen(true);
  };

  const openEdit = (s: Season) => {
    setEditing(s);
    setForm({ season_name: s.season_name, start_date: s.start_date, end_date: s.end_date, is_active: s.is_active });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.season_name || !form.start_date || !form.end_date) {
      toast({ title: 'يرجى تعبئة جميع الحقول', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('season_settings').update({
        season_name: form.season_name,
        start_date: form.start_date,
        end_date: form.end_date,
        is_active: form.is_active,
      }).eq('id', editing.id);
      if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      else toast({ title: 'تم التحديث بنجاح ✓' });
    } else {
      const { error } = await supabase.from('season_settings').insert({
        season_name: form.season_name,
        start_date: form.start_date,
        end_date: form.end_date,
        is_active: form.is_active,
      } as any);
      if (error) toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
      else toast({ title: 'تم الإنشاء بنجاح ✓' });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchSeasons();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من الحذف؟')) return;
    await supabase.from('season_settings').delete().eq('id', id);
    toast({ title: 'تم الحذف ✓' });
    fetchSeasons();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إعدادات المواسم</h1>
            <p className="text-muted-foreground text-sm mt-1">تعريف فترات المواسم لفلترة البيانات</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            إضافة موسم
          </Button>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">اسم الموسم</TableHead>
                  <TableHead className="text-center">تاريخ البداية</TableHead>
                  <TableHead className="text-center">تاريخ النهاية</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasons.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-right">{s.season_name}</TableCell>
                    <TableCell className="text-center text-sm">{s.start_date}</TableCell>
                    <TableCell className="text-center text-sm">{s.end_date}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={s.is_active ? 'default' : 'secondary'}>
                        {s.is_active ? 'نشط' : 'غير نشط'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {seasons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      لا توجد مواسم محددة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? 'تعديل الموسم' : 'إضافة موسم جديد'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>اسم الموسم</Label>
              <Input value={form.season_name} onChange={e => setForm(f => ({ ...f, season_name: e.target.value }))} placeholder="مثال: موسم 2026-2027" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>تاريخ البداية</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>تاريخ النهاية</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>موسم نشط</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
