import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Save, Plus, Trash2, Users, Loader2 } from 'lucide-react';

const SIZES = ['48', '50', '52', '54', '56', '58', '60', '62', '64'];
const SCARF_OPTIONS = ['بدون', 'شيفون', 'كريب', 'جيرسي'];
const HAT_OPTIONS = ['بدون', 'بونيه', 'طاقية'];
const EXTRA_SERVICES = ['تطريز الاسم', 'تعديل الطول', 'إضافة جيب'];

interface StudentRow {
  id: string;
  serialNumber: number;
  name: string;
  size: string;
  scarfChoice: string;
  hatChoice: string;
  extraServices: string[];
  nameError: string;
  similarWarning: string;
}

function createEmptyRow(serial: number): StudentRow {
  return {
    id: crypto.randomUUID(),
    serialNumber: serial,
    name: '',
    size: '',
    scarfChoice: '',
    hatChoice: '',
    extraServices: [],
    nameError: '',
    similarWarning: '',
  };
}

function validateName(raw: string): { cleaned: string; error: string } {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return { cleaned, error: '' };
  const isArabic = /[\u0600-\u06FF]/.test(cleaned);
  const words = cleaned.split(' ').map(w => w.replace(/-/g, '')).filter(Boolean);
  if (isArabic && words.length > 3) return { cleaned, error: 'الاسم العربي يجب ألا يتجاوز 3 كلمات' };
  if (!isArabic && words.length > 2) return { cleaned, error: 'الاسم الإنجليزي يجب ألا يتجاوز كلمتين' };
  return { cleaned, error: '' };
}

function areSimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return true;
  if (la.length < 2 || lb.length < 2) return false;
  if (la.includes(lb) || lb.includes(la)) return true;
  if (Math.abs(la.length - lb.length) > 2) return false;
  let diff = 0;
  const maxLen = Math.max(la.length, lb.length);
  for (let i = 0; i < maxLen; i++) {
    if (la[i] !== lb[i]) diff++;
    if (diff > 2) return false;
  }
  return diff <= 2;
}

export default function LeaderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentRow[]>(() =>
    Array.from({ length: 5 }, (_, i) => createEmptyRow(i + 1))
  );
  const [maxStudents, setMaxStudents] = useState(30);
  const [orderInfo, setOrderInfo] = useState<{ school_name: string; student_count: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    supabase
      .from('orders')
      .select('school_name, student_count')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setOrderInfo(data);
          setMaxStudents(data.student_count || 30);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      });
  }, [orderId]);

  const totalExtras = useMemo(
    () => students.reduce((sum, s) => sum + s.extraServices.length, 0),
    [students]
  );

  const updateStudent = useCallback((id: string, field: keyof StudentRow, value: any) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newS = { ...s, [field]: value };
      if (field === 'name') {
        const { cleaned, error } = validateName(value as string);
        newS.name = value as string;
        newS.nameError = error;
        const similar = prev.find(other => other.id !== id && areSimilar(cleaned, other.name.trim()));
        newS.similarWarning = similar ? `اسم مشابه: "${similar.name.trim()}" (صف ${similar.serialNumber})` : '';
      }
      return newS;
    }));
  }, []);

  const addRow = useCallback(() => {
    setStudents(prev => [...prev, createEmptyRow(prev.length + 1)]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, serialNumber: i + 1 })));
  }, []);

  const toggleExtra = useCallback((id: string, service: string) => {
    setStudents(prev => {
      const student = prev.find(s => s.id === id);
      if (!student) return prev;
      const currentTotal = prev.reduce((sum, s) => sum + s.extraServices.length, 0);
      const has = student.extraServices.includes(service);
      if (!has && currentTotal >= maxStudents) return prev;
      return prev.map(s => {
        if (s.id !== id) return s;
        return { ...s, extraServices: has ? s.extraServices.filter(e => e !== service) : [...s.extraServices, service] };
      });
    });
  }, [maxStudents]);

  const handleSave = async () => {
    if (!orderId) return;
    setSaving(true);
    const rows = students.filter(s => s.name.trim()).map(s => ({
      order_id: orderId,
      serial_number: s.serialNumber,
      name: s.name.trim(),
      size: s.size || null,
      scarf_choice: s.scarfChoice || null,
      hat_choice: s.hatChoice || null,
      extra_services: s.extraServices,
    }));

    const { error } = await supabase.from('students').upsert(rows, { onConflict: 'id' });
    if (error) {
      toast({ title: 'خطأ في الحفظ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحفظ بنجاح ✓' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">الطلب غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-foreground">
            {orderInfo?.school_name || 'إدخال بيانات الطالبات'}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {students.filter(s => s.name.trim()).length} / {maxStudents}
            </Badge>
            <Badge variant={totalExtras >= maxStudents ? 'destructive' : 'outline'} className="gap-1">
              خدمات إضافية: {totalExtras} / {maxStudents}
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-3 pt-3 pb-24">
        <div className="overflow-x-auto rounded-xl border border-border">
          <div className="min-w-[920px] max-h-[calc(100vh-210px)] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20 bg-card border-b border-border">
                <tr>
                  <th className="w-14 px-3 py-3 text-center font-semibold text-muted-foreground">#</th>
                  <th className="w-[280px] px-3 py-3 text-right font-semibold text-muted-foreground">اسم الطالبة</th>
                  <th className="w-[180px] px-3 py-3 text-center font-semibold text-muted-foreground">المقاس</th>
                  <th className="w-[160px] px-3 py-3 text-center font-semibold text-muted-foreground">الوشاح</th>
                  <th className="w-[140px] px-3 py-3 text-center font-semibold text-muted-foreground">القبعة</th>
                  <th className="w-[220px] px-3 py-3 text-center font-semibold text-muted-foreground">الخدمات الإضافية</th>
                  <th className="w-16 px-3 py-3 text-center font-semibold text-muted-foreground">حذف</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} className="border-b border-border/50 align-top">
                    <td className="px-3 py-3 text-center text-xs font-bold text-muted-foreground">{student.serialNumber}</td>
                    <td className="px-3 py-2.5">
                      <Input
                        value={student.name}
                        onChange={e => updateStudent(student.id, 'name', e.target.value)}
                        onBlur={e => updateStudent(student.id, 'name', e.target.value.trim().replace(/\s+/g, ' '))}
                        placeholder="الاسم"
                        className="h-9 text-xs"
                      />
                      {student.nameError && (
                        <p className="text-[10px] text-destructive flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {student.nameError}
                        </p>
                      )}
                      {student.similarWarning && (
                        <p className="text-[10px] text-warning flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {student.similarWarning}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {SIZES.map(size => (
                          <button
                            key={size}
                            onClick={() => updateStudent(student.id, 'size', size)}
                            className={`min-w-[34px] h-8 rounded-md text-xs font-medium transition-colors ${
                              student.size === size
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-accent'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {SCARF_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            onClick={() => updateStudent(student.id, 'scarfChoice', opt)}
                            className={`px-2 h-8 rounded-md text-xs font-medium transition-colors ${
                              student.scarfChoice === opt
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-accent'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {HAT_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            onClick={() => updateStudent(student.id, 'hatChoice', opt)}
                            className={`px-2 h-8 rounded-md text-xs font-medium transition-colors ${
                              student.hatChoice === opt
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-accent'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {EXTRA_SERVICES.map(service => {
                          const active = student.extraServices.includes(service);
                          const disabled = !active && totalExtras >= maxStudents;
                          return (
                            <button
                              key={service}
                              onClick={() => !disabled && toggleExtra(student.id, service)}
                              disabled={disabled}
                              className={`px-2 h-7 rounded-md text-[11px] font-medium transition-colors ${
                                active
                                  ? 'bg-accent text-accent-foreground'
                                  : disabled
                                  ? 'bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                                  : 'bg-muted text-muted-foreground hover:bg-accent'
                              }`}
                            >
                              {service}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => removeRow(student.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border p-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
          <Plus className="h-3.5 w-3.5" />
          صف
        </Button>
        <Button onClick={handleSave} disabled={saving} className="gap-1 flex-1">
          <Save className="h-3.5 w-3.5" />
          {saving ? 'جارٍ الحفظ...' : 'حفظ'}
        </Button>
      </div>
    </div>
  );
}
