import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, School } from 'lucide-react';

const SIZES = ['48', '50', '52', '54', '56', '58', '60', '62', '64'];
const SCARF_OPTIONS = ['بدون', 'شيفون', 'كريب', 'جيرسي'];
const HAT_OPTIONS = ['بدون', 'بونيه', 'طاقية'];
const EXTRA_SERVICES = ['تطريز الاسم', 'تعديل الطول', 'إضافة جيب'];

export default function StudentRegister() {
  const { orderId } = useParams<{ orderId: string }>();
  const { toast } = useToast();
  const [orderInfo, setOrderInfo] = useState<{ school_name: string; student_count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for single student
  const [name, setName] = useState('');
  const [size, setSize] = useState('');
  const [scarfChoice, setScarfChoice] = useState('');
  const [hatChoice, setHatChoice] = useState('');
  const [extraServices, setExtraServices] = useState<string[]>([]);

  // Count existing students
  const [existingCount, setExistingCount] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    Promise.all([
      supabase.from('orders').select('school_name, student_count').eq('id', orderId).single(),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('order_id', orderId),
    ]).then(([orderRes, countRes]) => {
      if (orderRes.error || !orderRes.data) {
        setNotFound(true);
      } else {
        setOrderInfo(orderRes.data);
        setExistingCount(countRes.count || 0);
      }
      setLoading(false);
    });
  }, [orderId]);

  const toggleExtra = (service: string) => {
    setExtraServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const handleSubmit = async () => {
    if (!orderId || !name.trim()) {
      toast({ title: 'يرجى إدخال الاسم', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const nextSerial = existingCount + 1;
    const { error } = await supabase.from('students').insert({
      order_id: orderId,
      serial_number: nextSerial,
      name: name.trim(),
      size: size || null,
      scarf_choice: scarfChoice || null,
      hat_choice: hatChoice || null,
      extra_services: extraServices,
    });

    if (error) {
      toast({ title: 'خطأ في الحفظ', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'تم التسجيل بنجاح ✓' });
      setName('');
      setSize('');
      setScarfChoice('');
      setHatChoice('');
      setExtraServices([]);
      setExistingCount(prev => prev + 1);
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

  const maxStudents = orderInfo?.student_count || 30;
  const isFull = existingCount >= maxStudents;

  return (
    <div className="min-h-screen bg-background p-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-4 pt-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-primary">
            <School className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold text-foreground">{orderInfo?.school_name || 'تسجيل الطالبة'}</h1>
          <p className="text-xs text-muted-foreground">
            {existingCount} / {maxStudents} طالبة مسجلة
          </p>
        </div>

        {isFull ? (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-warning font-medium">تم اكتمال العدد المطلوب من الطالبات</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardContent className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">اسم الطالبة *</label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="أدخلي اسمك"
                  className="bg-background"
                />
              </div>

              {/* Size */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">المقاس</label>
                <div className="flex flex-wrap gap-1.5">
                  {SIZES.map(s => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`min-w-[42px] h-9 rounded-lg text-sm font-medium transition-all ${
                        size === s
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-accent/20'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scarf */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">الوشاح</label>
                <div className="flex flex-wrap gap-1.5">
                  {SCARF_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setScarfChoice(opt)}
                      className={`px-4 h-9 rounded-lg text-sm font-medium transition-all ${
                        scarfChoice === opt
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-accent/20'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hat */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">القبعة</label>
                <div className="flex flex-wrap gap-1.5">
                  {HAT_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setHatChoice(opt)}
                      className={`px-4 h-9 rounded-lg text-sm font-medium transition-all ${
                        hatChoice === opt
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-accent/20'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra Services */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">خدمات إضافية</label>
                <div className="flex flex-wrap gap-1.5">
                  {EXTRA_SERVICES.map(service => (
                    <button
                      key={service}
                      onClick={() => toggleExtra(service)}
                      className={`px-3 h-9 rounded-lg text-sm font-medium transition-all ${
                        extraServices.includes(service)
                          ? 'bg-accent text-accent-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-accent/20'
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <Button onClick={handleSubmit} disabled={saving} className="w-full gap-1.5 h-11">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'جارٍ التسجيل...' : 'تسجيل'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
