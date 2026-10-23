import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Text, IconButton } from '@/design';
import { useRouter } from 'expo-router';
import AppLogo from '../components/app-logo';
import { IconSymbol, type SymbolName } from '@/components/ui/icon-symbol';
import { useT } from '@/i18n';

type SettingsState = {
  notifications: {
    rideUpdates: boolean;
    promotions: boolean;
    safety: boolean;
    wallet: boolean;
  };
  privacy: {
    shareLocation: boolean;
    analytics: boolean;
    marketing: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    currency: string;
  };
};

type ToggleSection = 'notifications' | 'privacy';
type NotificationKey = keyof SettingsState['notifications'];
type PrivacyKey = keyof SettingsState['privacy'];

export default function SettingsScreen() {
  const router = useRouter();
  const { t, locale, setLocale } = useT();

  // Settings state
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      rideUpdates: true,
      promotions: true,
      safety: true,
      wallet: true,
    },
    privacy: {
      shareLocation: true,
      analytics: false,
      marketing: false,
    },
    preferences: {
      theme: 'light',
      currency: 'FBU',
    },
  });

  const handleToggle = <S extends ToggleSection>(section: S, key: keyof SettingsState[S]) => {
    setSettings((prev) => {
      if (section === 'notifications') {
        const k = key as NotificationKey;
        return {
          ...prev,
          notifications: {
            ...prev.notifications,
            [k]: !prev.notifications[k],
          },
        };
      }

      const k = key as PrivacyKey;
      return {
        ...prev,
        privacy: {
          ...prev.privacy,
          [k]: !prev.privacy[k],
        },
      };
    });
  };

  const handleLanguageChange = () => {
    Alert.alert(
      t('settings.language'),
      t('settings.languagePick'),
      [
        { text: 'Français', onPress: () => setLocale('fr') },
        { text: 'English', onPress: () => setLocale('en') },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const handleThemeChange = () => {
    Alert.alert(
      t('settings.theme'),
      t('settings.themePick'),
      [
        { text: t('settings.light'), onPress: () => setTheme('light') },
        { text: t('settings.dark'), onPress: () => setTheme('dark') },
        { text: t('settings.auto'), onPress: () => setTheme('auto') },
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  const setTheme = (theme: SettingsState['preferences']['theme']) => {
    setSettings((prev) => ({ ...prev, preferences: { ...prev.preferences, theme } }));
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.delete'),
          style: 'destructive',
          onPress: () => Alert.alert(t('settings.deletion'), t('settings.deletionText')),
        },
      ]
    );
  };

  const renderSettingsSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const renderToggleItem = <S extends ToggleSection>(
    title: string,
    description: string,
    section: S,
    key: keyof SettingsState[S],
    icon?: SymbolName
  ) => {
    const value = settings[section][key] as boolean;

    return (
      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          {icon && <IconSymbol name={icon} size={20} color="#111111" style={styles.settingIcon} />}
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={() => handleToggle(section, key)}
        trackColor={{ false: '#e0e0e0', true: '#111111' }}
        thumbColor={value ? '#fff' : '#f4f3f4'}
      />
      </View>
    );
  };

  const renderSelectItem = (title: string, description: string, value: string, onPress: () => void, icon?: SymbolName) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        {icon && <IconSymbol name={icon} size={20} color="#111111" style={styles.settingIcon} />}
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <View style={styles.settingRight}>
        <Text style={styles.settingValue}>{value}</Text>
        <IconSymbol name="chevron.right" size={16} color="#888" />
      </View>
    </TouchableOpacity>
  );

  const renderActionItem = (title: string, description: string, onPress: () => void, icon?: SymbolName, color?: string) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        {icon && <IconSymbol name={icon} size={20} color={color || "#111111"} style={styles.settingIcon} />}
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, color && { color }]}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <IconSymbol name="chevron.right" size={16} color="#888" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
        <IconButton icon="chevron-left" label={t('common.back')} onPress={() => router.back()} />
      </View>
        <AppLogo size={40} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
      </View>

      {/* Notifications */}
      {renderSettingsSection(t('settings.notifications'), (
        <>
          {renderToggleItem(t('settings.rideUpdates'), t('settings.rideUpdatesText'), 'notifications', 'rideUpdates', 'bell.fill')}
          {renderToggleItem(t('settings.offers'), t('settings.offersText'), 'notifications', 'promotions', 'gift.fill')}
          {renderToggleItem(t('settings.safety'), t('settings.safetyText'), 'notifications', 'safety', 'shield.fill')}
          {renderToggleItem(t('settings.wallet'), t('settings.walletText'), 'notifications', 'wallet', 'creditcard.fill')}
        </>
      ))}

      {/* Privacy & Data */}
      {renderSettingsSection(t('settings.privacy'), (
        <>
          {renderToggleItem(t('settings.location'), t('settings.locationText'), 'privacy', 'shareLocation', 'location.fill')}
          {renderToggleItem(t('settings.analytics'), t('settings.analyticsText'), 'privacy', 'analytics', 'chart.bar.fill')}
          {renderToggleItem(t('settings.marketing'), t('settings.marketingText'), 'privacy', 'marketing', 'envelope.fill')}
        </>
      ))}

      {/* Preferences */}
      {renderSettingsSection(t('settings.preferences'), (
        <>
          {renderSelectItem(t('settings.language'), t('settings.languageText'), locale === 'fr' ? 'Français' : 'English', handleLanguageChange, 'globe')}
          {renderSelectItem(t('settings.theme'), t('settings.themeText'), t(`settings.${settings.preferences.theme}`), handleThemeChange, 'paintbrush.fill')}
          {renderSelectItem(t('settings.currency'), t('settings.currencyText'), settings.preferences.currency, () => Alert.alert(t('settings.currency'), t('settings.soon')), 'dollarsign.circle.fill')}
        </>
      ))}

      {/* Account Actions */}
      {renderSettingsSection(t('settings.account'), (
        <>
          {renderActionItem(t('settings.payment'), t('settings.paymentText'), () => Alert.alert(t('settings.payment'), t('settings.soon')), 'creditcard.fill')}
          {renderActionItem(t('settings.export'), t('settings.exportText'), () => Alert.alert(t('settings.export'), t('settings.soon')), 'square.and.arrow.down.fill')}
          {renderActionItem(t('settings.policy'), t('settings.policyText'), () => Alert.alert(t('settings.policy'), t('settings.soon')), 'doc.text.fill')}
          {renderActionItem(t('settings.terms'), t('settings.termsText'), () => Alert.alert(t('settings.terms'), t('settings.soon')), 'doc.fill')}
        </>
      ))}

      {/* Danger Zone */}
      {renderSettingsSection(t('settings.danger'), (
        <>
          {renderActionItem(t('settings.deleteAccount'), t('settings.deleteText'), handleDeleteAccount, 'trash.fill', '#d32f2f')}
        </>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Flow v1.0.0</Text>
        <Text style={styles.footerSubtext}>{t('settings.rights')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  titleContainer: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111111',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: '#111111',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
});