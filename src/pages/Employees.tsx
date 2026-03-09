import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Loader2, Users, Shield } from 'lucide-react';

interface Employee {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

const roleLabels: Record<string, { label: string; className: string }> = {
  owner: { label: 'مالك', className: 'bg-primary/10 text-primary border-primary/20' },
  manager: { label: 'مدير', className: 'bg-info/10 text-info border-info/20' },
  customer_service: { label: 'موظف', className: 'bg-warning/10 text-warning border-warning/20' },
};

export default function Employees() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'customer_service' });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('list-employees');
    if (error) {
      toast({ title: 'خطأ في تحميل الموظفين', variant: 'destructive' });
    } else {
      setEmployees(data?.employees || []);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      toast({ title: 'جميع الحقول مطلوبة', variant: 'destructive' });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
      return;
    }
    setAdding(true);
    const { data, error } = await supabase.functions.invoke('create-employee', {
      body: form,
    });
    if (error || data?.error) {
      toast({ title: data?.error || 'خطأ في إضافة الموظف', variant: 'destructive' });
    } else {
      toast({ title: 'تم إضافة الموظف بنجاح ✓' });
      setForm({ full_name: '', email: '', password: '', role: 'customer_service' });
      setShowAdd(false);
      loadEmployees();
    }
    setAdding(false);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('delete-employee', {
      body: { user_id: deletingId },
    });
    if (error || data?.error) {
      toast({ title: data?.error || 'خطأ في حذف الموظف', variant: 'destructive' });
    } else {
      toast({ title: 'تم حذف الموظف ✓' });
      loadEmployees();
    }
    setDeleting(false);
    setDeletingId(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">إدارة الموظفين</h1>
            <p className="text-muted-foreground text-sm mt-1">إضافة وإدارة صلاحيات الموظفين</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            إضافة موظف
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-primary">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{employees.length}</p>
                <p className="text-[11px] text-muted-foreground">إجمالي الموظفين</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-info">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {employees.filter(e => e.role === 'owner' || e.role === 'manager').length}
                </p>
                <p className="text-[11px] text-muted-foreground">المديرون</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-warning">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {employees.filter(e => e.role === 'customer_service').length}
                </p>
                <p className="text-[11px] text-muted-foreground">الموظفون</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : employees.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-6 text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">لا يوجد موظفون بعد</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">الصلاحية</TableHead>
                    <TableHead className="text-right w-[60px]">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map(emp => {
                    const role = roleLabels[emp.role] || roleLabels.customer_service;
                    const isSelf = emp.id === user?.id;
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium text-foreground">{emp.full_name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{emp.email}</TableCell>
                        <TableCell>
                          <Badge className={`${role.className} border text-[11px] px-2 py-0.5`}>
                            {role.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!isSelf && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeletingId(emp.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>حذف</TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Employee Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة موظف جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="أدخل اسم الموظف"
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>كلمة المرور</Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="6 أحرف على الأقل"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الصلاحية</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">مالك (Admin)</SelectItem>
                  <SelectItem value="manager">مدير (Manager)</SelectItem>
                  <SelectItem value="customer_service">موظف (Staff)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAdd(false)}>إلغاء</Button>
            <Button onClick={handleAdd} disabled={adding} className="gap-1.5">
              {adding && <Loader2 className="h-4 w-4 animate-spin" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف الموظف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الموظف؟ سيتم حذف حسابه بالكامل ولا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin ml-1" />}
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
