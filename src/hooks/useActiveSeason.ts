import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveSeason {
  id: string;
  season_name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export function useActiveSeason() {
  const [season, setSeason] = useState<ActiveSeason | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('season_settings')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      setSeason(data as ActiveSeason | null);
      setLoading(false);
    };
    fetch();
  }, []);

  return { season, loading };
}
