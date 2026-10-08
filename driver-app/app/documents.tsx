import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverWork } from '@/contexts/DriverWorkContext';
import { Badge, Button, Card, colors, Divider, Header, Icon, Screen, space, Text } from '@/design';
import { useT } from '@/i18n';
import { driversAPI } from '@/services/api';

const TYPES = ['licence', 'national_id', 'insurance', 'vehicle_photo'] as const;
type DocType = (typeof TYPES)[number];
type Doc = { id: number; type: DocType; uploaded_at: string };

// One clear photo per document; a new photo replaces the old one. The backend
// accepts JPEG, PNG or PDF up to 5 MB and checks the file itself.
export default function DocumentsScreen() {
  const router = useRouter();
  const { t, locale } = useT();
  const { token } = useAuth();
  const { profile, approval } = useDriverWork();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState<DocType | null>(null);

  const load = useCallback(async () => {
    if (!token || !profile) return;
    driversAPI.getDocuments(token).then((r) => setDocs(r.documents ?? [])).catch(() => {});
  }, [token, profile]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pick = async (type: DocType) => {
    if (!token) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert(t('documents.permission'));
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(type);
    try {
      await driversAPI.uploadDocument(token, type, {
        uri: asset.uri,
        name: asset.fileName ?? `${type}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
      await load();
    } catch (e) {
      Alert.alert(t('documents.uploadError'), e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(null);
    }
  };

  return (
    <Screen>
      <Header title={t('documents.title')} onBack={() => router.back()} backLabel={t('common.back')} />
      {!profile ? (
        <Card style={{ gap: space.md }}>
          <Text>{t('documents.needCar')}</Text>
          <Button label={t('account.car')} icon="truck" onPress={() => router.replace('/car')} />
        </Card>
      ) : (
        <>
          <Text color={colors.ink3} style={{ marginBottom: space.lg }}>{t('documents.intro')}</Text>
          <Card style={{ paddingVertical: space.sm }}>
            {TYPES.map((type, i) => {
              const doc = docs.find((d) => d.type === type);
              return (
                <View key={type}>
                  {i > 0 && <Divider />}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm }}>
                    <Icon name={doc ? 'check-circle' : 'circle'} size={24} color={doc ? colors.ink : colors.muted} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text weight="semibold">{t(`documents.${type}`)}</Text>
                      {doc
                        ? <Text variant="caption" color={colors.muted}>{t('documents.added', { date: new Date(doc.uploaded_at).toLocaleDateString(locale) })}</Text>
                        : <Badge label={t('documents.missing')} tone="warning" />}
                    </View>
                    {approval !== 'verified' && (
                      <Button size="md" variant={doc ? 'secondary' : 'primary'} label={doc ? t('documents.replace') : t('documents.add')}
                        onPress={() => pick(type)} loading={uploading === type} disabled={uploading !== null} />
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}
