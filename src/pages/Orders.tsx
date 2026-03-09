import { useState, useEffect, useMemo, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus,
  Copy,
  Check,
  Link,
  ShoppingCart,
  ExternalLink,
  Loader2,
  Search,
  Download,
  Upload,
  FileJson,
  ClipboardList,
  Clock,
  Users,
  Package,
} from 'lucide-react';
import CreateOrderDialog from '@/components/orders/CreateOrderDialog';

interface OrderLinks {
  leaderLink: string;
  registerLink: string;
  statusLink: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  leader_name: string | null;
  leader_phone: string | null;
  student_count: number | null;
  status: string;
  kit_id: string | null;
  order_type: string | null;
  created_at: string;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending_data: { label: 'بانتظار البيانات', className: 'bg-warning/10 text-warning border-warning/20' },
  in_progress: { label: 'قيد التنفيذ', className: 'bg-info/10 text-info border-info/20' },
  completed: { label: 'مكتمل', className: 'bg-success/10 text-success border-success/20' },
  cancelled: { label: 'ملغي', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function Orders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<OrderLinks | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kitFilter, setKitFilter] = useState('all');

  // Bulk export
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkExporting, setBulkExporting] = useState(false);

  // Kits for filter
  const [kits, setKits] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadOrders();
    loadKits();
    loadTotalStudents();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders((data as OrderRow[]) || []);
    setLoading(false);
  };

  const loadKits = async () => {
    const { data } = await supabase.from('ready_kits').select('id, name').eq('is_active', true);
    setKits(data || []);
  };

  const loadTotalStudents = async () => {
    const { count } = await supabase.from('students').select('*', { count: 'exact', head: true });
    setTotalStudents(count || 0);
  };

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending_data').length;
    const inProgress = orders.filter(o => o.status === 'in_progress').length;
    return { total, pending, inProgress, totalStudents };
  }, [orders, totalStudents]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(o =>
        (o.leader_name && o.leader_name.toLowerCase().includes(q)) ||
        (o.leader_phone && o.leader_phone.includes(q)) ||
        o.order_number.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }
    if (kitFilter !== 'all') {
      result = result.filter(o => o.kit_id === kitFilter);
    }
    return result;
  }, [orders, searchQuery, statusFilter, kitFilter]);

  const generateLinks = (orderId: string): OrderLinks => {
    const base = window.location.origin;
    return {
      leaderLink: `${base}/order/${orderId}/leader`,
      registerLink: `${base}/order/${orderId}/register`,
      statusLink: `${base}/order/${orderId}/status`,
    };
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const exportOrderJSON = async (orderId: string) => {
    const [orderRes, studentsRes] = await Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).single(),
      supabase.from('students').select('*').eq('order_id', orderId).order('serial_number'),
    ]);
    if (!orderRes.data) return;
    const payload = { order: orderRes.data, students: studentsRes.data || [] };
    downloadJSON(payload, `order-${orderRes.data.order_number}.json`);
  };

  const exportBulkJSON = async () => {
    if (selectedOrderIds.size === 0) {
      toast({ title: 'اختر طلبات للتصدير', variant: 'destructive' });
      return;
    }
    setBulkExporting(true);
    const ids = Array.from(selectedOrderIds);
    const [ordersRes, studentsRes] = await Promise.all([
      supabase.from('orders').select('*').in('id', ids),
      supabase.from('students').select('*').in('order_id', ids).order('serial_number'),
    ]);
    const ordersData = ordersRes.data || [];
    const studentsData = studentsRes.data || [];
    const payload = ordersData.map(order => ({
      order,
      students: studentsData.filter(s => s.order_id === order.id),
    }));
    downloadJSON(payload, `orders-export-${new Date().toISOString().slice(0, 10)}.json`);
    setBulkExporting(false);
    setSelectedOrderIds(new Set());
  };

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateOrderNumber = () => {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const r = Math.floor(Math.random() * 9000 + 1000);
    return `ORD-${y}${m}${d}-${r}`;
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        const orderData = item.order;
        if (!orderData) continue;

        const existing = orderData.id
          ? (await supabase.from('orders').select('id').eq('id', orderData.id).maybeSingle()).data
          : null;

        if (existing) {
          const { id, created_at, ...updateFields } = orderData;
          await supabase.from('orders').update(updateFields).eq('id', existing.id);
          if (item.students?.length) {
            await supabase.from('students').delete().eq('order_id', existing.id);
            await supabase.from('students').insert(
              item.students.map((s: any) => ({ ...s, id: undefined, order_id: existing.id }))
            );
          }
        } else {
          const { id, created_at, updated_at, ...insertFields } = orderData;
          const { data: newOrder } = await supabase
            .from('orders')
            .insert({ ...insertFields, employee_id: user.id, order_number: insertFields.order_number || generateOrderNumber() })
            .select('id')
            .single();

          if (newOrder && item.students?.length) {
            await supabase.from('students').insert(
              item.students.map((s: any) => ({ ...s, id: undefined, order_id: newOrder.id }))
            );
          }
        }
      }

      toast({ title: `تم استيراد ${items.length} طلب بنجاح ✓` });
      loadOrders();
      loadTotalStudents();
    } catch (err) {
      toast({ title: 'خطأ في قراءة الملف', description: 'تأكد من صحة تنسيق JSON', variant: 'destructive' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOrderCreated = (orderId: string) => {
    const links = generateLinks(orderId);
    setGeneratedLinks(links);
    setShowLinks(true);
    loadOrders();
    loadTotalStudents();
  };

  const statsCards = [
    { label: 'إجمالي الطلبات', value: stats.total, icon: ClipboardList, color: 'text-primary' },
    { label: 'بانتظار البيانات', value: stats.pending, icon: Clock, color: 'text-warning' },
    { label: 'قيد التنفيذ', value: stats.inProgress, icon: Package, color: 'text-info' },
    { label: 'الطالبات المسجلات', value: stats.totalStudents, icon: Users, color: 'text-success' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">الطلبات</h1>
            <p className="text-muted-foreground text-sm mt-1">إنشاء وإدارة ومتابعة الطلبات</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1">
              <Upload className="h-3.5 w-3.5" />
              استيراد
            </Button>
            <Button onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              طلب جديد
            </Button>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statsCards.map(card => (
            <Card key={card.label} className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{card.value}</p>
                  <p className="text-[11px] text-muted-foreground">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو رقم الجوال أو رقم الطلب..."
              className="pr-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="pending_data">بانتظار البيانات</SelectItem>
              <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
          {kits.length > 0 && (
            <Select value={kitFilter} onValueChange={setKitFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="الطقم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأطقم</SelectItem>
                {kits.map(k => (
                  <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedOrderIds.size > 0 && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted border border-border">
            <span className="text-sm text-muted-foreground">تم تحديد {selectedOrderIds.size} طلب</span>
            <Button variant="outline" size="sm" onClick={exportBulkJSON} disabled={bulkExporting} className="gap-1">
              {bulkExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              تصدير جماعي
            </Button>
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-6 text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">
                {orders.length === 0 ? 'لا توجد طلبات بعد' : 'لا توجد نتائج مطابقة'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => {
              const status = statusLabels[order.status] || statusLabels.pending_data;
              const links = generateLinks(order.id);
              return (
                <Card key={order.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedOrderIds.has(order.id)}
                        onCheckedChange={() => toggleSelectOrder(order.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-foreground text-sm">{order.order_number}</p>
                            <p className="text-muted-foreground text-xs">
                              {(order as any).order_type === 'custom' ? 'تفصيل جديد' : 'طقم جاهز'}
                            </p>
                          </div>
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {order.leader_name && <span>القائدة: {order.leader_name}</span>}
                          {order.student_count && <span>• {order.student_count} طالبة</span>}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs flex-1"
                            onClick={() => {
                              setGeneratedLinks(links);
                              setShowLinks(true);
                            }}
                          >
                            <Link className="h-3 w-3" />
                            الروابط
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => exportOrderJSON(order.id)}
                          >
                            <FileJson className="h-3 w-3" />
                            تصدير
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => window.open(links.statusLink, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3" />
                            متابعة
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Order Dialog */}
      {user && (
        <CreateOrderDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          userId={user.id}
          onCreated={handleOrderCreated}
        />
      )}

      {/* Links Modal */}
      <Dialog open={showLinks} onOpenChange={setShowLinks}>
        <DialogContent className="max-w-sm border-0 shadow-2xl bg-gradient-to-br from-card/80 via-card/90 to-card/80 backdrop-blur-2xl ring-1 ring-border/20" dir="rtl">
          <DialogHeader className="pb-1">
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/10">
                <Link className="h-4 w-4 text-primary" />
              </div>
              <span>روابط الطلب</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2.5 mt-2">
            {generatedLinks && (
              <>
                <LinkCard
                  label="رابط القائدة"
                  description="إدارة الطلب وبيانات الطالبات"
                  url={generatedLinks.leaderLink}
                  icon="👑"
                  accentClass="from-amber-500/15 to-amber-500/5 ring-amber-500/20"
                  copied={copiedField === 'leader'}
                  onCopy={() => copyToClipboard(generatedLinks.leaderLink, 'leader')}
                />
                <LinkCard
                  label="رابط تسجيل الطالبات"
                  description="نموذج إدخال بيانات الطالبات"
                  url={generatedLinks.registerLink}
                  icon="📝"
                  accentClass="from-blue-500/15 to-blue-500/5 ring-blue-500/20"
                  copied={copiedField === 'register'}
                  onCopy={() => copyToClipboard(generatedLinks.registerLink, 'register')}
                />
                <LinkCard
                  label="رابط متابعة الحالة"
                  description="تتبع حالة الطلب للعميل"
                  url={generatedLinks.statusLink}
                  icon="📦"
                  accentClass="from-emerald-500/15 to-emerald-500/5 ring-emerald-500/20"
                  copied={copiedField === 'status'}
                  onCopy={() => copyToClipboard(generatedLinks.statusLink, 'status')}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function LinkCard({
  label,
  description,
  url,
  icon,
  accentClass,
  copied,
  onCopy,
}: {
  label: string;
  description: string;
  url: string;
  icon: string;
  accentClass?: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className={`rounded-xl p-3.5 space-y-2.5 transition-all bg-gradient-to-br ${accentClass || 'from-muted/50 to-muted/20'} ring-1 hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <div>
            <p className="text-sm font-bold text-foreground">{label}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>
        <Button
          variant={copied ? 'default' : 'outline'}
          size="icon"
          onClick={onCopy}
          className={`h-8 w-8 shrink-0 rounded-lg transition-all shadow-sm ${copied ? 'bg-emerald-500 hover:bg-emerald-500 text-white border-0' : 'bg-background/80 backdrop-blur-sm'}`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <div className="flex items-center rounded-lg bg-background/60 backdrop-blur-sm border border-border/30 px-3 py-2">
        <p className="text-[10px] text-muted-foreground truncate flex-1 font-mono" dir="ltr">{url}</p>
      </div>
    </div>
  );
}
