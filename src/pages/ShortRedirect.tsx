import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function ShortRedirect() {
  const { code } = useParams<{ code: string }>();

  useEffect(() => {
    if (!code) return;
    supabase
      .from('short_links')
      .select('original_url')
      .eq('code', code)
      .single()
      .then(({ data }) => {
        if (data?.original_url) {
          window.location.replace(data.original_url);
        } else {
          window.location.replace('/');
        }
      });
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
