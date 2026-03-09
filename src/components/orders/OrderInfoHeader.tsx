import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  orderId: string;
}

interface OrderDetails {
  order_type: string | null;
  kit_name: string | null;
  custom_abaya_color: string | null;
  custom_abaya_color_degree: string | null;
  custom_scarf_color: string | null;
  custom_scarf_color_degree: string | null;
  custom_hat_color: string | null;
  custom_hat_color_degree: string | null;
  abaya_design_name: string | null;
  sleeve_style_name: string | null;
  sleeve_color: string | null;
  kit_abaya_color: string | null;
  kit_scarf_color: string | null;
  kit_hat_color: string | null;
}

export default function OrderInfoHeader({ orderId }: Props) {
  const [details, setDetails] = useState<OrderDetails | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('orders')
        .select(`
          order_type, custom_abaya_color, custom_abaya_color_degree,
          custom_scarf_color, custom_scarf_color_degree,
          custom_hat_color, custom_hat_color_degree,
          sleeve_color,
          ready_kits!kit_id(name, abaya_color, scarf_color, hat_color),
          abaya_designs!abaya_design_id(name),
          sleeve_styles!sleeve_style_id(name)
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (cancelled || !data) return;
      const d = data as any;
      setDetails({
        order_type: d.order_type,
        kit_name: d.ready_kits?.name || null,
        custom_abaya_color: d.custom_abaya_color,
        custom_abaya_color_degree: d.custom_abaya_color_degree,
        custom_scarf_color: d.custom_scarf_color,
        custom_scarf_color_degree: d.custom_scarf_color_degree,
        custom_hat_color: d.custom_hat_color,
        custom_hat_color_degree: d.custom_hat_color_degree,
        abaya_design_name: d.abaya_designs?.name || null,
        sleeve_style_name: d.sleeve_styles?.name || null,
        sleeve_color: d.sleeve_color,
        kit_abaya_color: d.ready_kits?.abaya_color || null,
        kit_scarf_color: d.ready_kits?.scarf_color || null,
        kit_hat_color: d.ready_kits?.hat_color || null,
      });
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  if (!details) return null;

  const isCustom = details.order_type === 'custom';
  const abayaColor = isCustom
    ? [details.custom_abaya_color, details.custom_abaya_color_degree].filter(Boolean).join(' ')
    : details.kit_abaya_color;
  const scarfColor = isCustom
    ? [details.custom_scarf_color, details.custom_scarf_color_degree].filter(Boolean).join(' ')
    : details.kit_scarf_color;
  const hatColor = isCustom
    ? [details.custom_hat_color, details.custom_hat_color_degree].filter(Boolean).join(' ')
    : details.kit_hat_color;

  // Line 1: type + colors
  const line1Parts: string[] = [];
  if (isCustom) {
    line1Parts.push('تفصيل جديد');
  } else {
    line1Parts.push(details.kit_name ? `اسم الطقم: ${details.kit_name}` : 'طقم جاهز');
  }
  if (abayaColor) line1Parts.push(`عباية: ${abayaColor}`);
  if (scarfColor) line1Parts.push(`وشاح: ${scarfColor}`);
  if (hatColor) line1Parts.push(`قبعة: ${hatColor}`);

  // Line 2: design details
  const line2Parts: string[] = [];
  if (details.abaya_design_name) line2Parts.push(`تصميم العباية: ${details.abaya_design_name}`);
  if (details.sleeve_style_name) line2Parts.push(`طرف الكم: ${details.sleeve_style_name}`);
  if (details.sleeve_color) line2Parts.push(`لون طرف الكم: ${details.sleeve_color}`);

  return (
    <div className="px-4 py-2 bg-muted/30 border-b border-border space-y-0.5">
      <p className="text-[11px] text-foreground font-medium">
        {line1Parts.join(' - ')}
      </p>
      {line2Parts.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {line2Parts.join(' - ')}
        </p>
      )}
    </div>
  );
}
