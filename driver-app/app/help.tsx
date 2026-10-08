import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Card, colors, Divider, Field, Header, Screen, space, Text } from '@/design';
import { useT } from '@/i18n';
import { supportAPI } from '@/services/api';

// A few answers, and a message to the Flow team (a support ticket; replies
// arrive as notifications).
export default function HelpScreen() {
  const router = useRouter();
  const { t } = useT();
  const { token } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!token) return;
    setSending(true);
    try {
      await supportAPI.submitTicket(token, { category: 'driver', subject: subject.trim(), message: message.trim() });
      setSubject('');
      setMessage('');
      Alert.alert(t('help.sentTitle'), t('help.sentText'));
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : undefined);
    } finally {
      setSending(false);
    }
  };

  const faq: [string, string][] = [
    [t('help.faq1q'), t('help.faq1a')],
    [t('help.faq2q'), t('help.faq2a')],
    [t('help.faq3q'), t('help.faq3a')],
  ];

  return (
    <Screen>
      <Header title={t('help.title')} onBack={() => router.back()} backLabel={t('common.back')} />
      <Card>
        {faq.map(([q, a], i) => (
          <View key={q}>
            {i > 0 && <Divider />}
            <Text weight="semibold">{q}</Text>
            <Text color={colors.ink3} style={{ marginTop: 4 }}>{a}</Text>
          </View>
        ))}
      </Card>
      <Text variant="heading" style={{ marginTop: space.xxl, marginBottom: space.md }}>{t('help.contactTitle')}</Text>
      <View style={{ gap: space.lg }}>
        <Field label={t('help.subject')} value={subject} onChangeText={setSubject} maxLength={200} />
        <Field label={t('help.message')} value={message} onChangeText={setMessage} multiline maxLength={5000}
          style={{ height: 140, paddingTop: space.md, textAlignVertical: 'top' }} />
        <Button size="xl" label={t('help.send')} icon="send" onPress={send} loading={sending} disabled={!subject.trim() || !message.trim()} />
      </View>
    </Screen>
  );
}
