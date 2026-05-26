import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, ImagePlus, X, Copy } from 'lucide-react';

interface MasterItem {
  id: string;
  name: string;
  image_url?: string | null;
}

interface ScarfDesignEntry {
  localId: string;
  scarf_style_id: string;
  date_type_id: string;
  scarf_method_id: string;
  embroidery_direction_id: string;
  font_id: string;
  embroidery_color: string;
}

const EMBROIDERY_COLORS = [
  { value: 'فضي', label: 'فضي' },
  { value: 'ذهبي', label: 'ذهبي' },
  { value: 'أسود', label: 'أسود' },
  { value: 'أبيض', label: 'أبيض' },
];

const MAX_SCARVES = 5;

function createEmptyScarfDesign(): ScarfDesignEntry {
  return {
    localId: crypto.randomUUID(),
    scarf_style_id: '',
    date_type_id: '',
    scarf_method_id: '',
    embroidery_direction_id: '',
    font_id: '',
    embroidery_color: '',
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCreated: (orderId: string) => void;
  editOrderId?: string | null;
}

export default function CreateOrderDialog({ open, onOpenChange, userId, onCreated, editOrderId }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Basic fields
  const [leaderName, setLeaderName] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [extraScarfCount, setExtraScarfCount] = useState('');
  const [extraHatCount, setExtraHatCount] = useState('');
  const [executionDuration, setExecutionDuration] = useState('');
  const [orderType, setOrderType] = useState<'ready_kit' | 'custom'>('ready_kit');
  const [selectedKit, setSelectedKit] = useState('');

  // Custom order colors
  const [customAbayaColor, setCustomAbayaColor] = useState('');
  const [customAbayaColorDegree, setCustomAbayaColorDegree] = useState('');
  const [customScarfColor, setCustomScarfColor] = useState('');
  const [customScarfColorDegree, setCustomScarfColorDegree] = useState('');
  const [customHatColor, setCustomHatColor] = useState('');
  const [customHatColorDegree, setCustomHatColorDegree] = useState('');
  const [colorImage, setColorImage] = useState<File | null>(null);
  const [colorImagePreview, setColorImagePreview] = useState('');

  // Abaya design section
  const [abayaDesignId, setAbayaDesignId] = useState('');
  const [abayaLength, setAbayaLength] = useState('ثابت');
  const [sleeveStyleId, setSleeveStyleId] = useState('');
  const [sleeveColor, setSleeveColor] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Scarf designs (multiple)
  const [scarfDesigns, setScarfDesigns] = useState<ScarfDesignEntry[]>([createEmptyScarfDesign()]);

  // Extra services
  const [logoEmbroideryEnabled, setLogoEmbroideryEnabled] = useState(false);
  const [logoEmbroideryCount, setLogoEmbroideryCount] = useState('');
  const [logoEmbroideryFile, setLogoEmbroideryFile] = useState<File | null>(null);
  const [logoEmbroideryPreview, setLogoEmbroideryPreview] = useState('');
  const [backEmbroideryEnabled, setBackEmbroideryEnabled] = useState(false);
  const [backEmbroideryCount, setBackEmbroideryCount] = useState('');
  const [backEmbroideryFiles, setBackEmbroideryFiles] = useState<File[]>([]);
  const [backEmbroideryPreviews, setBackEmbroideryPreviews] = useState<string[]>([]);
  const [hatEmbroideryEnabled, setHatEmbroideryEnabled] = useState(false);
  const [hatEmbroideryCount, setHatEmbroideryCount] = useState('');
  const [mainHatFringeColor, setMainHatFringeColor] = useState('');
  const [mainHatFringeError, setMainHatFringeError] = useState('');
  const [purplePackageEnabled, setPurplePackageEnabled] = useState(false);
  const [purplePackageCount, setPurplePackageCount] = useState('');

  // Hat embroidery designs for extra hats
  const [hatEmbroideries, setHatEmbroideries] = useState<{ id: string; name: string; has_extra_text: boolean }[]>([]);

  // Master data
  const [kits, setKits] = useState<MasterItem[]>([]);
  const [abayaDesigns, setAbayaDesigns] = useState<MasterItem[]>([]);
  const [sleeveStyles, setSleeveStyles] = useState<MasterItem[]>([]);
  const [scarfStyles, setScarfStyles] = useState<MasterItem[]>([]);
  const [scarfMethods, setScarfMethods] = useState<MasterItem[]>([]);
  const [dateTypes, setDateTypes] = useState<MasterItem[]>([]);
  const [embroideryDirections, setEmbroideryDirections] = useState<MasterItem[]>([]);
  const [fonts, setFonts] = useState<MasterItem[]>([]);

  useEffect(() => {
    if (!open) return;
    loadMasterData();
  }, [open]);

  // Load existing order data when editing
  useEffect(() => {
    if (!open || !editOrderId) return;
    loadEditData();
  }, [open, editOrderId]);

  useEffect(() => {
    if ((parseInt(studentCount) || 0) === 0) {
      setMainHatFringeColor('');
      setMainHatFringeError('');
    }
  }, [studentCount]);

  const loadMasterData = async () => {
    const [kitsR, abayaR, sleeveR, scarfSR, scarfMR, dateR, embR, fontR, hatEmbR] = await Promise.all([
      supabase.from('ready_kits').select('*').eq('is_active', true),
      supabase.from('abaya_designs').select('id, name, image_url').eq('is_active', true),
      supabase.from('sleeve_styles').select('id, name, image_url').eq('is_active', true),
      supabase.from('scarf_styles').select('id, name, image_url').eq('is_active', true),
      supabase.from('scarf_methods').select('id, name, image_url').eq('is_active', true),
      supabase.from('date_types').select('id, name').eq('is_active', true),
      supabase.from('embroidery_directions').select('id, name, image_url').eq('is_active', true),
      supabase.from('fonts').select('id, name').eq('is_active', true),
      supabase.from('hat_embroideries').select('id, name, has_extra_text').eq('is_active', true).order('created_at'),
    ]);
    setKits(kitsR.data || []);
    setAbayaDesigns(abayaR.data || []);
    setSleeveStyles(sleeveR.data || []);
    setScarfStyles(scarfSR.data || []);
    setScarfMethods(scarfMR.data || []);
    setDateTypes(dateR.data || []);
    setEmbroideryDirections(embR.data || []);
    setFonts(fontR.data || []);
    setHatEmbroideries((hatEmbR.data || []) as any);
  };

  const loadEditData = async () => {
    if (!editOrderId) return;
    setLoadingEdit(true);
    
    const [orderRes, scarfRes] = await Promise.all([
      supabase.from('orders').select('*').eq('id', editOrderId).single(),
      supabase.from('order_scarf_designs').select('*').eq('order_id', editOrderId).order('sort_order'),
    ]);

    if (orderRes.data) {
      const o = orderRes.data as any;
      setLeaderName(o.leader_name || '');
      setLeaderPhone(o.leader_phone || '');
      setStudentCount(String(o.student_count || ''));
      setExtraScarfCount(String(o.extra_scarf_count || ''));
      setExtraHatCount(String(o.extra_hat_count || ''));
      setExecutionDuration(o.execution_duration ? String(o.execution_duration) : '');
      setOrderType(o.order_type === 'custom' ? 'custom' : 'ready_kit');
      setSelectedKit(o.kit_id || '');
      setCustomAbayaColor(o.custom_abaya_color || '');
      setCustomAbayaColorDegree(o.custom_abaya_color_degree || '');
      setCustomScarfColor(o.custom_scarf_color || '');
      setCustomScarfColorDegree(o.custom_scarf_color_degree || '');
      setCustomHatColor(o.custom_hat_color || '');
      setCustomHatColorDegree(o.custom_hat_color_degree || '');
      setColorImagePreview(o.color_image_url || '');
      setAbayaDesignId(o.abaya_design_id || '');
      setAbayaLength(o.abaya_length || 'ثابت');
      setSleeveStyleId(o.sleeve_style_id || '');
      setSleeveColor(o.sleeve_color || '');
      setPhoneError('');
      setScarfDesigns([createEmptyScarfDesign()]);
      setLogoEmbroideryEnabled(o.logo_embroidery_enabled || false);
      setLogoEmbroideryCount(o.logo_embroidery_count ? String(o.logo_embroidery_count) : '');
      setLogoEmbroideryPreview(o.logo_embroidery_image_url || '');
      setLogoEmbroideryFile(null);
      setBackEmbroideryEnabled(o.back_embroidery_enabled || false);
      setBackEmbroideryCount(o.back_embroidery_count ? String(o.back_embroidery_count) : '');
      setBackEmbroideryPreviews(o.back_embroidery_image_urls || []);
      setBackEmbroideryFiles([]);
      setHatEmbroideryEnabled(o.hat_embroidery_enabled || false);
      setHatEmbroideryCount(o.hat_embroidery_count ? String(o.hat_embroidery_count) : '');
      setMainHatFringeColor(o.main_hat_fringe_color || '');
      setMainHatFringeError('');
      setPurplePackageEnabled(o.purple_package_enabled || false);
      setPurplePackageCount(o.purple_package_count ? String(o.purple_package_count) : '');
    }

    if (scarfRes.data && scarfRes.data.length > 0) {
      setScarfDesigns(scarfRes.data.map((s: any) => ({
        localId: s.id || crypto.randomUUID(),
        scarf_style_id: s.scarf_style_id || '',
        date_type_id: s.date_type_id || '',
        scarf_method_id: s.scarf_method_id || '',
        embroidery_direction_id: s.embroidery_direction_id || '',
        font_id: s.font_id || '',
        embroidery_color: s.embroidery_color || '',
      })));
    } else {
      setScarfDesigns([createEmptyScarfDesign()]);
    }

    setLoadingEdit(false);
  };

  const resetForm = () => {
    setLeaderName('');
    setLeaderPhone('');
    setStudentCount('');
    setExtraScarfCount('');
    setExtraHatCount('');
    setExecutionDuration('');
    setOrderType('ready_kit');
    setSelectedKit('');
    setCustomAbayaColor('');
    setCustomAbayaColorDegree('');
    setCustomScarfColor('');
    setCustomScarfColorDegree('');
    setCustomHatColor('');
    setCustomHatColorDegree('');
    setColorImage(null);
    setColorImagePreview('');
    setAbayaDesignId('');
    setAbayaLength('ثابت');
    setSleeveStyleId('');
    setSleeveColor('');
    setPhoneError('');
    setScarfDesigns([createEmptyScarfDesign()]);
    setLogoEmbroideryEnabled(false);
    setLogoEmbroideryCount('');
    setLogoEmbroideryFile(null);
    setLogoEmbroideryPreview('');
    setBackEmbroideryEnabled(false);
    setBackEmbroideryCount('');
    setBackEmbroideryFiles([]);
    setBackEmbroideryPreviews([]);
    setHatEmbroideryEnabled(false);
    setHatEmbroideryCount('');
    setMainHatFringeColor('');
    setMainHatFringeError('');
    setPurplePackageEnabled(false);
    setPurplePackageCount('');
  };

  const handleColorImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setColorImage(file);
    setColorImagePreview(URL.createObjectURL(file));
  };

  // Real-time phone validation
  const handlePhoneChange = (value: string) => {
    setLeaderPhone(value);
    const digits = value.replace(/\D/g, '');
    if (value.trim() && digits.length > 0 && digits.length < 10) {
      setPhoneError('رقم الجوال يجب أن يتكون من 10 أرقام');
    } else {
      setPhoneError('');
    }
  };

  const addScarfDesign = () => {
    if (scarfDesigns.length >= MAX_SCARVES) return;
    setScarfDesigns(prev => [...prev, createEmptyScarfDesign()]);
  };

  const duplicatePreviousScarf = () => {
    if (scarfDesigns.length >= MAX_SCARVES) return;
    const lastScarf = scarfDesigns[scarfDesigns.length - 1];
    const clone: ScarfDesignEntry = {
      ...lastScarf,
      localId: crypto.randomUUID(),
    };
    setScarfDesigns(prev => [...prev, clone]);
  };

  const removeScarfDesign = (localId: string) => {
    if (scarfDesigns.length <= 1) return;
    setScarfDesigns(prev => prev.filter(s => s.localId !== localId));
  };

  const updateScarfDesign = (localId: string, field: keyof ScarfDesignEntry, value: string) => {
    setScarfDesigns(prev => prev.map(s => s.localId === localId ? { ...s, [field]: value } : s));
  };

  const hasMainHats = (parseInt(studentCount) || 0) > 0;

  const handleSubmit = async () => {
    const sc = parseInt(studentCount) || 0;
    const esc = parseInt(extraScarfCount) || 0;
    const ehc = parseInt(extraHatCount) || 0;
    const includesMainHats = sc > 0;

    // At least one of student_count, extra_scarf_count, extra_hat_count must be > 0
    if (sc < 1 && esc < 1 && ehc < 1) {
      toast({ title: 'يجب إدخال عدد الأطقم أو الأوشحة/القبعات الإضافية', variant: 'destructive' });
      return;
    }
    // Phone validation: optional but if entered must be 10 digits
    const phone = leaderPhone.trim();
    if (phone && !/^\d{10}$/.test(phone)) {
      setPhoneError('رقم الجوال يجب أن يتكون من 10 أرقام');
      toast({ title: 'رقم الجوال يجب أن يتكون من 10 أرقام', variant: 'destructive' });
      return;
    }
    setPhoneError('');

    if (includesMainHats && !mainHatFringeColor) {
      const message = 'الرجاء اختيار لون هدب القبعات';
      setMainHatFringeError(message);
      toast({ title: message, variant: 'destructive' });
      return;
    }
    setMainHatFringeError('');

    setSaving(true);
    try {
      // Upload color image if exists (new file only)
      let colorImageUrl: string | null = colorImagePreview || null;
      if (colorImage) {
        const ext = colorImage.name.split('.').pop();
        const path = `orders/colors/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('images').upload(path, colorImage);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('images').getPublicUrl(path);
          colorImageUrl = urlData.publicUrl;
        }
      }

      // Upload logo embroidery file (single)
      let logoImageUrl: string | null = logoEmbroideryPreview || null;
      if (logoEmbroideryFile) {
        const ext = logoEmbroideryFile.name.split('.').pop();
        const path = `orders/logo-embroidery/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('images').upload(path, logoEmbroideryFile);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('images').getPublicUrl(path);
          logoImageUrl = urlData.publicUrl;
        }
      }

      // Upload back embroidery files (multiple)
      let backImageUrls: string[] = [...backEmbroideryPreviews.filter(p => p.startsWith('http'))];
      if (backEmbroideryFiles.length > 0) {
        for (const file of backEmbroideryFiles) {
          const ext = file.name.split('.').pop();
          const path = `orders/back-embroidery/${crypto.randomUUID()}.${ext}`;
          const { error: uploadErr } = await supabase.storage.from('images').upload(path, file);
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from('images').getPublicUrl(path);
            backImageUrls.push(urlData.publicUrl);
          }
        }
      }

      const orderPayload = {
        leader_name: leaderName.trim() || null,
        leader_phone: leaderPhone.trim() || null,
        student_count: sc,
        extra_scarf_count: esc,
        extra_hat_count: ehc,
        execution_duration: parseInt(executionDuration) || null,
        order_type: orderType,
        kit_id: orderType === 'ready_kit' ? (selectedKit || null) : null,
        city_id: null,
        custom_abaya_color: orderType === 'custom' ? customAbayaColor || null : null,
        custom_abaya_color_degree: orderType === 'custom' ? customAbayaColorDegree || null : null,
        custom_scarf_color: orderType === 'custom' ? customScarfColor || null : null,
        custom_scarf_color_degree: orderType === 'custom' ? customScarfColorDegree || null : null,
        custom_hat_color: orderType === 'custom' ? customHatColor || null : null,
        custom_hat_color_degree: orderType === 'custom' ? customHatColorDegree || null : null,
        color_image_url: colorImageUrl,
        abaya_design_id: abayaDesignId || null,
        abaya_length: abayaLength || 'ثابت',
        sleeve_style_id: sleeveStyleId || null,
        sleeve_color: sleeveColor || null,
        logo_embroidery_enabled: logoEmbroideryEnabled,
        logo_embroidery_count: logoEmbroideryEnabled ? (parseInt(logoEmbroideryCount) || 0) : 0,
        logo_embroidery_image_url: logoEmbroideryEnabled ? logoImageUrl : null,
        back_embroidery_enabled: backEmbroideryEnabled,
        back_embroidery_count: backEmbroideryEnabled ? (parseInt(backEmbroideryCount) || 0) : 0,
        back_embroidery_image_urls: backEmbroideryEnabled ? backImageUrls : [],
        hat_embroidery_enabled: hatEmbroideryEnabled,
        hat_embroidery_count: hatEmbroideryEnabled ? (parseInt(hatEmbroideryCount) || 0) : 0,
        main_hat_fringe_color: includesMainHats ? mainHatFringeColor : null,
        purple_package_enabled: purplePackageEnabled,
        purple_package_count: purplePackageEnabled ? Math.min(parseInt(purplePackageCount) || 0, sc) : 0,
      };

      let finalOrderId: string;

      if (editOrderId) {
        // UPDATE existing order
        const { error: updateErr } = await supabase
          .from('orders')
          .update(orderPayload as any)
          .eq('id', editOrderId);
        if (updateErr) throw updateErr;
        finalOrderId = editOrderId;

        // Replace scarf designs
        await supabase.from('order_scarf_designs').delete().eq('order_id', editOrderId);
      } else {
        // INSERT new order
        const orderNumber = generateOrderNumber();
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .insert({
            ...orderPayload,
            order_number: orderNumber,
            employee_id: userId,
            status: 'pending_data' as const,
          } as any)
          .select('id')
          .single();
        if (orderErr) throw orderErr;
        finalOrderId = orderData.id;

        // Update links
        await supabase
          .from('orders')
          .update({
            leader_link: finalOrderId,
            registration_link: finalOrderId,
            tracking_link: finalOrderId,
          })
          .eq('id', finalOrderId);
      }

      // Save scarf designs
      if (scarfDesigns.length > 0) {
        const scarfRows = scarfDesigns.map((s, i) => ({
          order_id: finalOrderId,
          scarf_style_id: s.scarf_style_id || null,
          date_type_id: s.date_type_id || null,
          scarf_method_id: s.scarf_method_id || null,
          embroidery_direction_id: s.embroidery_direction_id || null,
          font_id: s.font_id || null,
          embroidery_color: s.embroidery_color || null,
          sort_order: i + 1,
        }));
        await supabase.from('order_scarf_designs').insert(scarfRows as any);
      }

      toast({ title: editOrderId ? 'تم تعديل الطلب بنجاح ✓' : `تم إنشاء الطلب بنجاح ✓` });
      resetForm();
      onOpenChange(false);
      onCreated(finalOrderId);
    } catch (err: any) {
      toast({ title: 'خطأ في حفظ الطلب', description: err.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const generateOrderNumber = () => {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const r = Math.floor(Math.random() * 9000 + 1000);
    return `ORD-${y}${m}${d}-${r}`;
  };

  const isEditMode = !!editOrderId;
  const canAddScarf = scarfDesigns.length < MAX_SCARVES;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'تعديل الطلب' : 'إنشاء طلب جديد'}</DialogTitle>
        </DialogHeader>

        {loadingEdit ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">اسم القائدة</label>
                <Input value={leaderName} onChange={e => setLeaderName(e.target.value)} placeholder="اسم القائدة" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">رقم الجوال</label>
                <Input value={leaderPhone} onChange={e => handlePhoneChange(e.target.value)} placeholder="05xxxxxxxx" type="tel" />
                {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">عدد الأطقم</label>
                <Input value={studentCount} onChange={e => setStudentCount(e.target.value)} placeholder="0" type="number" min="0" />
                <p className="text-[10px] text-muted-foreground mt-0.5">اتركه 0 للأوشحة/قبعات فقط</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">مدة التنفيذ (أيام)</label>
                <Input value={executionDuration} onChange={e => setExecutionDuration(e.target.value)} placeholder="عدد الأيام" type="number" min="1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">أوشحة إضافية</label>
                <Input value={extraScarfCount} onChange={e => setExtraScarfCount(e.target.value)} placeholder="0" type="number" min="0" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">قبعات إضافية</label>
                <Input value={extraHatCount} onChange={e => setExtraHatCount(e.target.value)} placeholder="0" type="number" min="0" />
              </div>
            </div>

            {/* Hat embroidery designs info for extra hats */}
            {parseInt(extraHatCount) > 0 && hatEmbroideries.length > 0 && (
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-sm font-semibold text-foreground mb-2">تصاميم تطريز القبعات المتاحة</p>
                <div className="flex flex-wrap gap-2">
                  {hatEmbroideries.map(h => (
                    <Badge key={h.id} variant="secondary" className="text-xs">{h.name}</Badge>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">القائدة ستختار التصميم لكل قبعة إضافية من رابطها</p>
              </div>
            )}

            {/* Order Type */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">نوع الطلب</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderType('ready_kit')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    orderType === 'ready_kit'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                  }`}
                >
                  طقم جاهز
                </button>
                <button
                  onClick={() => setOrderType('custom')}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    orderType === 'custom'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                  }`}
                >
                  تفصيل جديد
                </button>
              </div>
            </div>

            {/* Ready Kit Selection */}
            {orderType === 'ready_kit' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">اختر الطقم</label>
                <Select value={selectedKit} onValueChange={(kitId) => {
                  setSelectedKit(kitId);
                  const kit = kits.find(k => k.id === kitId) as any;
                  if (kit) {
                    if (kit.abaya_design_id) setAbayaDesignId(kit.abaya_design_id);
                    if (kit.sleeve_style_id) setSleeveStyleId(kit.sleeve_style_id);
                    if (kit.sleeve_color) setSleeveColor(kit.sleeve_color);
                    if (kit.abaya_color) setCustomAbayaColor(kit.abaya_color);
                    if (kit.abaya_color_degree) setCustomAbayaColorDegree(kit.abaya_color_degree);
                    if (kit.scarf_color) setCustomScarfColor(kit.scarf_color);
                    if (kit.scarf_color_degree) setCustomScarfColorDegree(kit.scarf_color_degree);
                    if (kit.hat_color) setCustomHatColor(kit.hat_color);
                    if (kit.hat_color_degree) setCustomHatColorDegree(kit.hat_color_degree);
                    if (kit.font_id) {
                      setScarfDesigns(prev => prev.map(s => ({ ...s, font_id: kit.font_id })));
                    }
                    if (kit.scarf_style_id) {
                      setScarfDesigns(prev => prev.map(s => ({ ...s, scarf_style_id: kit.scarf_style_id })));
                    }
                    if (kit.scarf_method_id) {
                      setScarfDesigns(prev => prev.map(s => ({ ...s, scarf_method_id: kit.scarf_method_id })));
                    }
                    if (kit.date_type_id) {
                      setScarfDesigns(prev => prev.map(s => ({ ...s, date_type_id: kit.date_type_id })));
                    }
                    if (kit.embroidery_direction_id) {
                      setScarfDesigns(prev => prev.map(s => ({ ...s, embroidery_direction_id: kit.embroidery_direction_id })));
                    }
                    if (kit.embroidery_color) {
                      setScarfDesigns(prev => prev.map(s => ({ ...s, embroidery_color: kit.embroidery_color })));
                    }
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="اختر الطقم" /></SelectTrigger>
                  <SelectContent>
                    {kits.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Custom Colors */}
            {orderType === 'custom' && (
              <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-sm font-semibold text-foreground">ألوان التفصيل</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">لون العباية</label>
                    <Input value={customAbayaColor} onChange={e => setCustomAbayaColor(e.target.value)} placeholder="اللون" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">درجة اللون</label>
                    <Input value={customAbayaColorDegree} onChange={e => setCustomAbayaColorDegree(e.target.value)} placeholder="الدرجة" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">لون الوشاح</label>
                    <Input value={customScarfColor} onChange={e => setCustomScarfColor(e.target.value)} placeholder="اللون" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">درجة اللون</label>
                    <Input value={customScarfColorDegree} onChange={e => setCustomScarfColorDegree(e.target.value)} placeholder="الدرجة" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">لون القبعة</label>
                    <Input value={customHatColor} onChange={e => setCustomHatColor(e.target.value)} placeholder="اللون" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">درجة اللون</label>
                    <Input value={customHatColorDegree} onChange={e => setCustomHatColorDegree(e.target.value)} placeholder="الدرجة" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">صورة الألوان</label>
                  {colorImagePreview ? (
                    <div className="relative w-24 h-24">
                      <img src={colorImagePreview} className="w-full h-full object-cover rounded-lg" />
                      <button onClick={() => { setColorImage(null); setColorImagePreview(''); }} className="absolute -top-1.5 -left-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors">
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleColorImage} />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Abaya Design Section */}
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <p className="text-sm font-semibold text-foreground">تصميم العباية</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">شكل العباية</label>
                  <Select value={abayaDesignId} onValueChange={setAbayaDesignId}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {abayaDesigns.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">طول العباية</label>
                  <Select value={abayaLength} onValueChange={setAbayaLength}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ثابت">ثابت</SelectItem>
                      <SelectItem value="ميدي">ميدي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">طرف الكم</label>
                  <Select value={sleeveStyleId} onValueChange={setSleeveStyleId}>
                    <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      {sleeveStyles.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">لون طرف الكم</label>
                  <Input value={sleeveColor} onChange={e => setSleeveColor(e.target.value)} placeholder="اللون" />
                </div>
              </div>
            </div>

            {/* Scarf Designs Section */}
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">تصاميم الأوشحة</p>
                <span className="text-xs text-muted-foreground">{scarfDesigns.length} / {MAX_SCARVES}</span>
              </div>
              {scarfDesigns.map((scarf, idx) => (
                <div key={scarf.localId} className="p-3 rounded-lg bg-background border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">وشاح {idx + 1}</Badge>
                    {scarfDesigns.length > 1 && (
                      <button onClick={() => removeScarfDesign(scarf.localId)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-0.5 block">تصميم الوشاح</label>
                      <Select value={scarf.scarf_style_id} onValueChange={v => updateScarfDesign(scarf.localId, 'scarf_style_id', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر" /></SelectTrigger>
                        <SelectContent>{scarfStyles.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-0.5 block">نوع التاريخ</label>
                      <Select value={scarf.date_type_id} onValueChange={v => updateScarfDesign(scarf.localId, 'date_type_id', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر" /></SelectTrigger>
                        <SelectContent>{dateTypes.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-0.5 block">طرف الوشاح</label>
                      <Select value={scarf.scarf_method_id} onValueChange={v => updateScarfDesign(scarf.localId, 'scarf_method_id', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر" /></SelectTrigger>
                        <SelectContent>{scarfMethods.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-0.5 block">اتجاه التطريز</label>
                      <Select value={scarf.embroidery_direction_id} onValueChange={v => updateScarfDesign(scarf.localId, 'embroidery_direction_id', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر" /></SelectTrigger>
                        <SelectContent>{embroideryDirections.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-0.5 block">خط التطريز</label>
                      <Select value={scarf.font_id} onValueChange={v => updateScarfDesign(scarf.localId, 'font_id', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر" /></SelectTrigger>
                        <SelectContent>{fonts.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground mb-0.5 block">لون التطريز</label>
                      <Select value={scarf.embroidery_color} onValueChange={v => updateScarfDesign(scarf.localId, 'embroidery_color', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر" /></SelectTrigger>
                        <SelectContent>
                          {EMBROIDERY_COLORS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addScarfDesign} disabled={!canAddScarf} className="gap-1 text-xs flex-1">
                  <Plus className="h-3 w-3" /> إضافة وشاح
                </Button>
                {scarfDesigns.length > 0 && (
                  <Button variant="outline" size="sm" onClick={duplicatePreviousScarf} disabled={!canAddScarf} className="gap-1 text-xs flex-1">
                    <Copy className="h-3 w-3" /> تكرار الوشاح السابق
                  </Button>
                )}
              </div>
            </div>

            {/* Hat Designs Section */}
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <p className="text-sm font-semibold text-foreground">تصاميم القبعات</p>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">لون هدب القبعات</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'فضي', label: 'هدب فضي' },
                    { value: 'ذهبي', label: 'هدب ذهبي' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!hasMainHats}
                      onClick={() => {
                        setMainHatFringeColor(option.value);
                        setMainHatFringeError('');
                      }}
                      className={`h-10 rounded-lg border text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        mainHatFringeColor === option.value
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background text-foreground border-border hover:bg-accent/10'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {mainHatFringeError && (
                  <p className="text-xs text-destructive mt-1">{mainHatFringeError}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {hasMainHats ? 'هذا اللون يطبق على القبعات الأساسية داخل الأطقم.' : 'فعّل عدد الأطقم لاختيار لون هدب القبعات الأساسية.'}
                </p>
              </div>
            </div>

            {/* Extra Services */}
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <p className="text-sm font-semibold text-foreground">الخدمات الإضافية</p>
              <div className="space-y-3">
                {/* Logo Embroidery */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={logoEmbroideryEnabled} onCheckedChange={setLogoEmbroideryEnabled} />
                      <span className="text-sm text-foreground">تطريز شعار</span>
                    </div>
                    {logoEmbroideryEnabled && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">العدد:</label>
                        <Input
                          value={logoEmbroideryCount}
                          onChange={e => setLogoEmbroideryCount(e.target.value)}
                          placeholder="الكل"
                          type="number"
                          min="1"
                          className="w-20 h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                  {logoEmbroideryEnabled && (
                    <div className="mt-2 mr-8">
                      <label className="text-xs text-muted-foreground mb-1 block">صورة الشعار (JPG, PNG, PDF)</label>
                      {logoEmbroideryPreview ? (
                        <div className="relative w-20 h-20 inline-block">
                          {logoEmbroideryPreview.endsWith('.pdf') ? (
                            <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground border border-border">PDF</div>
                          ) : (
                            <img src={logoEmbroideryPreview} className="w-full h-full object-cover rounded-lg border border-border" />
                          )}
                          <button onClick={() => { setLogoEmbroideryFile(null); setLogoEmbroideryPreview(''); }} className="absolute -top-1.5 -left-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors">
                          <ImagePlus className="h-5 w-5 text-muted-foreground" />
                          <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setLogoEmbroideryFile(file);
                            setLogoEmbroideryPreview(file.type === 'application/pdf' ? file.name + '.pdf' : URL.createObjectURL(file));
                          }} />
                        </label>
                      )}
                    </div>
                  )}
                </div>

                {/* Back Embroidery */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={backEmbroideryEnabled} onCheckedChange={setBackEmbroideryEnabled} />
                      <span className="text-sm text-foreground">تطريز خلفي</span>
                    </div>
                    {backEmbroideryEnabled && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">العدد:</label>
                        <Input
                          value={backEmbroideryCount}
                          onChange={e => setBackEmbroideryCount(e.target.value)}
                          placeholder="الكل"
                          type="number"
                          min="1"
                          className="w-20 h-8 text-xs"
                        />
                      </div>
                    )}
                  </div>
                  {backEmbroideryEnabled && (
                    <div className="mt-2 mr-8">
                      <label className="text-xs text-muted-foreground mb-1 block">صور التطريز الخلفي (JPG, PNG, PDF - متعدد)</label>
                      <div className="flex flex-wrap gap-2">
                        {backEmbroideryPreviews.map((preview, idx) => (
                          <div key={idx} className="relative w-20 h-20">
                            {preview.endsWith('.pdf') || preview.includes('.pdf') ? (
                              <div className="w-full h-full rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground border border-border">PDF</div>
                            ) : (
                              <img src={preview} className="w-full h-full object-cover rounded-lg border border-border" />
                            )}
                            <button onClick={() => {
                              setBackEmbroideryPreviews(prev => prev.filter((_, i) => i !== idx));
                              if (preview.startsWith('blob:')) {
                                const fileIdx = backEmbroideryPreviews.slice(0, idx).filter(p => p.startsWith('blob:')).length;
                                setBackEmbroideryFiles(prev => prev.filter((_, i) => i !== fileIdx));
                              }
                            }} className="absolute -top-1.5 -left-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        <label className="flex items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted/50 transition-colors">
                          <ImagePlus className="h-5 w-5 text-muted-foreground" />
                          <input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple className="hidden" onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            setBackEmbroideryFiles(prev => [...prev, ...files]);
                            const newPreviews = files.map(f => f.type === 'application/pdf' ? f.name + '.pdf' : URL.createObjectURL(f));
                            setBackEmbroideryPreviews(prev => [...prev, ...newPreviews]);
                          }} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={hatEmbroideryEnabled} onCheckedChange={setHatEmbroideryEnabled} />
                    <span className="text-sm text-foreground">تطريز قبعة</span>
                  </div>
                  {hatEmbroideryEnabled && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">العدد:</label>
                      <Input
                        value={hatEmbroideryCount}
                        onChange={e => setHatEmbroideryCount(e.target.value)}
                        placeholder="الكل"
                        type="number"
                        min="1"
                        className="w-20 h-8 text-xs"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={purplePackageEnabled} onCheckedChange={setPurplePackageEnabled} />
                    <span className="text-sm text-foreground">بكج Purple</span>
                  </div>
                  {purplePackageEnabled && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">العدد:</label>
                      <Input
                        value={purplePackageCount}
                        onChange={e => {
                          const max = parseInt(studentCount) || 0;
                          const val = parseInt(e.target.value) || 0;
                          if (val > max) {
                            setPurplePackageCount(String(max));
                          } else {
                            setPurplePackageCount(e.target.value);
                          }
                        }}
                        placeholder="العدد"
                        type="number"
                        min="1"
                        max={parseInt(studentCount) || undefined}
                        className="w-20 h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={saving} className="w-full gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditMode ? <Loader2 className="h-4 w-4 hidden" /> : <Plus className="h-4 w-4" />}
              {saving ? 'جارٍ الحفظ...' : isEditMode ? 'حفظ التعديلات' : 'حفظ وإرسال الطلب'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
