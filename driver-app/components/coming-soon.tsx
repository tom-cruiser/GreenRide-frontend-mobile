import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { EmptyState, Header, Screen } from '@/design';
import { features } from '@/config/features';
import { useT } from '@/i18n';

// A screen behind a feature flag (config/features.ts). Off: it is not
// reachable (no link points to it, and opening it directly goes Home).
export function FlaggedScreen({ flag, title, children }: { flag: keyof typeof features; title: string; children?: React.ReactNode }) {
  const router = useRouter();
  const { t } = useT();
  if (!features[flag]) return <Redirect href="/(tabs)" />;
  return (
    <Screen>
      <Header title={title} onBack={() => router.back()} backLabel={t('common.back')} />
      {children ?? <EmptyState icon="clock" title={title} />}
    </Screen>
  );
}
