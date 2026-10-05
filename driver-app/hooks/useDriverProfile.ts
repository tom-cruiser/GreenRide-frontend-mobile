import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, driversAPI } from '@/services/api';

export type DriverProfile = {
  user_id: number;
  vehicle_make: string | null;
  vehicle_model: string | null;
  license_number: string | null;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
};

// not_onboarded: no vehicle details yet · pending: waiting for admin approval
// verified: approved, can accept rides
export type DriverStatus = 'loading' | 'not_onboarded' | 'pending' | 'verified' | 'error';

export function useDriverProfile() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [status, setStatus] = useState<DriverStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      const { driver } = await driversAPI.getMe(token);
      setProfile(driver);
      setStatus(driver.verified ? 'verified' : 'pending');
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setProfile(null);
        setStatus('not_onboarded');
        setError(null);
      } else {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Could not load your driver profile');
      }
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { profile, setProfile, status, setStatus, error, reload };
}

export const STATUS_LABELS: Record<DriverStatus, string> = {
  loading: 'Checking status…',
  not_onboarded: 'Finish registration',
  pending: 'Waiting for approval',
  verified: 'Approved driver',
  error: 'Status unavailable',
};
