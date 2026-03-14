import { useEffect, useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import {
  ClipboardList, Loader2, Users, Scissors, TrendingUp,
  CalendarDays, CalendarRange, Calendar as CalendarIcon, Clock,
  AlertTriangle, Activity, ArrowLeftRight
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, subDays, startOfDay, startOfWeek, startOfMonth, isAfter, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

type FilterPeriod = 'today' | 'week' | 'month' | 'custom';

interface OrderRow {
  id: string;
  status: string;
  created_at: string;
  student_count: number | null;
  extra_scarf_count: number | null;
  extra_hat_count: number | null;
  employee_id: string;
  city_id: string | null;
  execution_duration: number | null;
  order_number: string;
  updated_at: string;
}

interface AuditRow {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  user_id: string | null;
  created_at: string;
  new_values: any;
  old_values: any;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
}

interface CityRow {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending_data: 'hsl(38,90%,55%)',
  under_review: 'hsl(210,60%,50%)',
  in_progress: 'hsl(210,60%,50%)',
  shipped: 'hsl(280,50%,55%)',
  completed: 'hsl(145,60%,40%)',
  cancelled: 'hsl(0,70%,55%)',
};

const STATUS_LABELS: Record<string, string> = {
  pending_data: 'بانتظار البيانات',
  under_review: 'قيد المراجعة',
  in_progress: 'قيد التنفيذ',
  shipped: 'تم الشحن',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
};

const DELAYED_DAYS_THRESHOLD = 7;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [cities, setCities] = useState<CityRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);

  const [filter, setFilter] = useState<FilterPeriod>('month');
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  useEffect(() => {
    async function load() {
      const [oRes, pRes, cRes, aRes] = await Promise.all([
        supabase.from('orders').select('id,status,created_at,student_count,extra_scarf_count,extra_hat_count,employee_id,city_id,execution_duration,order_number,updated_at'),
        supabase.from('profiles').select('user_id,full_name'),
        supabase.from('cities').select('id,name'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      if (oRes.data) setOrders(oRes.data as OrderRow[]);
      if (pRes.data) setProfiles(pRes.data as ProfileRow[]);
      if (cRes.data) setCities(cRes.data as CityRow[]);
      if (aRes.data) setAudits(aRes.data as AuditRow[]);
      setLoading(false);
    }
    load();
  }, []);

  const getDateRange = useCallback((): { from: Date; to: Date } => {
    const now = new Date();
    const to = now;
    switch (filter) {
      case 'today': return { from: startOfDay(now), to };
      case 'week': return { from: startOfWeek(now, { weekStartsOn: 6 }), to };
      case 'month': return { from: startOfMonth(now), to };
      case 'custom': return { from: customFrom || subDays(now, 30), to: customTo || now };
    }
  }, [filter, customFrom, customTo]);

  const filteredOrders = useMemo(() => {
    const { from, to } = getDateRange();
    return orders.filter(o => {
      const d = new Date(o.created_at);
      return !isBefore(d, from) && !isAfter(d, to);
    });
  }, [orders, getDateRange]);

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach(p => { m[p.user_id] = p.full_name; });
    return m;
  }, [profiles]);

  const cityMap = useMemo(() => {
    const m: Record<string, string> = {};
    cities.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [cities]);

  // === STATS ===
  const stats = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const activeOrders = filteredOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;
    const totalStudents = filteredOrders.reduce((s, o) => s + (o.student_count || 0), 0);
    const totalPieces = filteredOrders.reduce((s, o) => {
      return s + (o.student_count || 0) + (o.extra_scarf_count || 0) + (o.extra_hat_count || 0);
    }, 0);
    return { totalOrders, activeOrders, totalStudents, totalPieces };
  }, [filteredOrders]);

  // === PIE DATA ===
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
      fill: STATUS_COLORS[status] || 'hsl(0,0%,70%)',
    }));
  }, [filteredOrders]);

  // === BAR DATA (top 5 cities) ===
  const barData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach(o => {
      if (o.city_id) counts[o.city_id] = (counts[o.city_id] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cid, count]) => ({ name: cityMap[cid] || 'غير محدد', count }));
  }, [filteredOrders, cityMap]);

  // === LINE DATA (daily registrations) ===
  const lineData = useMemo(() => {
    const { from, to } = getDateRange();
    const days: Record<string, { orders: number; students: number }> = {};
    let d = new Date(from);
    while (d <= to) {
      const key = format(d, 'MM/dd');
      days[key] = { orders: 0, students: 0 };
      d = new Date(d.getTime() + 86400000);
    }
    filteredOrders.forEach(o => {
      const key = format(new Date(o.created_at), 'MM/dd');
      if (days[key]) {
        days[key].orders++;
        days[key].students += o.student_count || 0;
      }
    });
    return Object.entries(days).map(([date, v]) => ({ date, ...v }));
  }, [filteredOrders, getDateRange]);

  // === EMPLOYEE PERFORMANCE ===
  const employeeStats = useMemo(() => {
    const map: Record<string, { total: number; submitted: number; lastActivity: string }> = {};
    filteredOrders.forEach(o => {
      if (!map[o.employee_id]) map[o.employee_id] = { total: 0, submitted: 0, lastActivity: o.updated_at };
      map[o.employee_id].total++;
      if (o.status !== 'pending_data') map[o.employee_id].submitted++;
      if (new Date(o.updated_at) > new Date(map[o.employee_id].lastActivity)) {
        map[o.employee_id].lastActivity = o.updated_at;
      }
    });
    return Object.entries(map).map(([eid, s]) => ({
      name: profileMap[eid] || 'موظف',
      ...s,
    })).sort((a, b) => b.total - a.total);
  }, [filteredOrders, profileMap]);

  // === RECENT ACTIVITY ===
  const recentActivity = useMemo(() => {
    return audits.slice(0, 5).map(a => {
      const who = a.user_id ? (profileMap[a.user_id] || 'مستخدم') : 'النظام';
      const orderNum = a.new_values?.order_number || a.old_values?.order_number || '';
      const actionLabel = a.action === 'INSERT' ? 'أنشأ' : a.action === 'UPDATE' ? 'عدّل' : a.action;
      const tableLabel = a.table_name === 'orders' ? 'الطلب' : a.table_name === 'students' ? 'بيانات الطالبة في' : a.table_name;
      return {
        id: a.id,
        text: `${who} ${actionLabel} ${tableLabel} ${orderNum}`,
        time: a.created_at,
      };
    });
  }, [audits, profileMap]);

  // === DELAYED ORDERS ===
  const delayedOrders = useMemo(() => {
    const threshold = subDays(new Date(), DELAYED_DAYS_THRESHOLD);
    return orders.filter(o =>
      o.status !== 'completed' && o.status !== 'cancelled' &&
      isBefore(new Date(o.created_at), threshold)
    );
  }, [orders]);

  const statCards = [
    { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: ClipboardList, gradient: 'from-primary/10 to-primary/5', iconColor: 'text-primary' },
    { label: 'طلبات قيد التنفيذ', value: stats.activeOrders, icon: TrendingUp, gradient: 'from-[hsl(var(--info))]/10 to-[hsl(var(--info))]/5', iconColor: 'text-[hsl(var(--info))]' },
    { label: 'إجمالي الطالبات', value: stats.totalStudents, icon: Users, gradient: 'from-[hsl(var(--success))]/10 to-[hsl(var(--success))]/5', iconColor: 'text-[hsl(var(--success))]' },
    { label: 'القطع المطلوبة', value: stats.totalPieces, icon: Scissors, gradient: 'from-accent/10 to-accent/5', iconColor: 'text-accent' },
  ];

  const filterButtons: { key: FilterPeriod; label: string; icon: typeof CalendarDays }[] = [
    { key: 'today', label: 'اليوم', icon: CalendarDays },
    { key: 'week', label: 'الأسبوع', icon: CalendarRange },
    { key: 'month', label: 'الشهر', icon: CalendarIcon },
  ];

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
        {/* Header + Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
            <p className="text-muted-foreground text-sm mt-1">نظرة عامة على الأداء والعمليات</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {filterButtons.map(fb => {
              const Icon = fb.icon;
              return (
                <Button
                  key={fb.key}
                  size="sm"
                  variant={filter === fb.key ? 'default' : 'outline'}
                  onClick={() => setFilter(fb.key)}
                  className="gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {fb.label}
                </Button>
              );
            })}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant={filter === 'custom' ? 'default' : 'outline'} className="gap-1.5">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  مخصص
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4 space-y-3" align="end">
                <p className="text-xs font-medium text-muted-foreground">من</p>
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={(d) => { setCustomFrom(d); setFilter('custom'); }}
                  className="p-2 pointer-events-auto"
                />
                <p className="text-xs font-medium text-muted-foreground">إلى</p>
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={(d) => { setCustomTo(d); setFilter('custom'); }}
                  className="p-2 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="border-border/50 hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br', card.gradient)}>
                      <Icon className={cn('h-5 w-5', card.iconColor)} />
                    </div>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">{card.value.toLocaleString('ar-SA')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pie Chart */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">توزيع حالات الطلبات</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {pieData.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">لا توجد بيانات</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => v.toLocaleString('ar-SA')} />
                    <Legend wrapperStyle={{ fontSize: '11px', direction: 'rtl' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Bar Chart - Top Cities */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">أكثر المدن طلباً</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {barData.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">لا توجد بيانات</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 60, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={55} />
                    <Tooltip formatter={(v: number) => v.toLocaleString('ar-SA')} />
                    <Bar dataKey="count" name="عدد الطلبات" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Line Chart - Timeline */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">معدل التسجيل اليومي</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {lineData.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">لا توجد بيانات</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={lineData} margin={{ left: 5, right: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => v.toLocaleString('ar-SA')} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="orders" name="الطلبات" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="students" name="الطالبات" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delayed Orders Alert */}
        {delayedOrders.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                طلبات متأخرة ({delayedOrders.length})
                <span className="text-xs font-normal text-muted-foreground mr-2">أكثر من {DELAYED_DAYS_THRESHOLD} أيام بدون اكتمال</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex flex-wrap gap-2">
                {delayedOrders.slice(0, 10).map(o => (
                  <Badge key={o.id} variant="outline" className="border-destructive/40 text-destructive text-xs">
                    {o.order_number} — {STATUS_LABELS[o.status] || o.status}
                  </Badge>
                ))}
                {delayedOrders.length > 10 && (
                  <Badge variant="outline" className="border-muted text-muted-foreground text-xs">
                    +{delayedOrders.length - 10} أخرى
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom Row: Employee Performance + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Employee Table */}
          <Card className="border-border/50 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                أداء الموظفين
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {employeeStats.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-6">لا توجد بيانات</p>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الموظف</TableHead>
                        <TableHead className="text-center">عدد الطلبات</TableHead>
                        <TableHead className="text-center">طلبات مكتملة البيانات</TableHead>
                        <TableHead className="text-center">آخر نشاط</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeStats.map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-right">{e.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-xs">{e.total}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">{e.submitted}</Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {format(new Date(e.lastActivity), 'dd/MM HH:mm', { locale: ar })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                آخر النشاطات
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {recentActivity.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-6">لا توجد نشاطات</p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map(a => (
                    <div key={a.id} className="flex items-start gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground leading-relaxed truncate">{a.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(a.time), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
