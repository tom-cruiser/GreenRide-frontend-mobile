import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Text } from '@/design';
import { useRouter } from 'expo-router';
import AppLogo from '../components/app-logo';
import { IconSymbol, type SymbolName } from '@/components/ui/icon-symbol';

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
    theme: string;
    language: string;
    currency: string;
  };
};

type ToggleSection = 'notifications' | 'privacy';
type NotificationKey = keyof SettingsState['notifications'];
type PrivacyKey = keyof SettingsState['privacy'];
type PreferenceKey = keyof SettingsState['preferences'];

export default function SettingsScreen() {
  const router = useRouter();
  
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
      language: 'English',
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
      'Language',
      'Select your preferred language',
      [
        { text: 'English', onPress: () => updatePreference('language', 'English') },
        { text: 'Kirundi', onPress: () => updatePreference('language', 'Kirundi') },
        { text: 'French', onPress: () => updatePreference('language', 'French') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleThemeChange = () => {
    Alert.alert(
      'Theme',
      'Select your preferred theme',
      [
        { text: 'Light', onPress: () => updatePreference('theme', 'Light') },
        { text: 'Dark', onPress: () => updatePreference('theme', 'Dark') },
        { text: 'Auto', onPress: () => updatePreference('theme', 'Auto') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const updatePreference = (key: PreferenceKey, value: string) => {
    setSettings((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value,
      },
    }));
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => Alert.alert('Account Deletion', 'Account deletion process will be initiated. You will receive an email with further instructions.'),
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
        <TouchableOpacity style={styles.goBack} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#111111" />
          <Text style={styles.goBackText}>Back</Text>
        </TouchableOpacity>
        <AppLogo size={40} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Customize your app experience</Text>
      </View>

      {/* Notifications */}
      {renderSettingsSection('Notifications', (
        <>
          {renderToggleItem('Ride Updates', 'Get notified about ride status changes', 'notifications', 'rideUpdates', 'bell.fill')}
          {renderToggleItem('Promotional Offers', 'Receive notifications about discounts and offers', 'notifications', 'promotions', 'gift.fill')}
          {renderToggleItem('Safety Alerts', 'Important safety and security notifications', 'notifications', 'safety', 'shield.fill')}
          {renderToggleItem('Wallet Activity', 'Notifications for payment and wallet changes', 'notifications', 'wallet', 'creditcard.fill')}
        </>
      ))}

      {/* Privacy & Data */}
      {renderSettingsSection('Privacy & Data', (
        <>
          {renderToggleItem('Location Sharing', 'Share location for better ride experience', 'privacy', 'shareLocation', 'location.fill')}
          {renderToggleItem('Analytics & Performance', 'Help improve app performance', 'privacy', 'analytics', 'chart.bar.fill')}
          {renderToggleItem('Marketing Communications', 'Receive marketing emails and messages', 'privacy', 'marketing', 'envelope.fill')}
        </>
      ))}

      {/* Preferences */}
      {renderSettingsSection('Preferences', (
        <>
          {renderSelectItem('Language', 'Choose your preferred language', settings.preferences.language, handleLanguageChange, 'globe')}
          {renderSelectItem('Theme', 'Customize app appearance', settings.preferences.theme, handleThemeChange, 'paintbrush.fill')}
          {renderSelectItem('Currency', 'Display currency preference', settings.preferences.currency, () => Alert.alert('Currency', 'Currency setting coming soon'), 'dollarsign.circle.fill')}
        </>
      ))}

      {/* Account Actions */}
      {renderSettingsSection('Account', (
        <>
          {renderActionItem('Payment Methods', 'Manage your payment options', () => Alert.alert('Payment Methods', 'Payment management coming soon'), 'creditcard.fill')}
          {renderActionItem('Data Export', 'Download your data', () => Alert.alert('Data Export', 'Data export feature coming soon'), 'square.and.arrow.down.fill')}
          {renderActionItem('Privacy Policy', 'Read our privacy policy', () => Alert.alert('Privacy Policy', 'Opening privacy policy...'), 'doc.text.fill')}
          {renderActionItem('Terms of Service', 'View terms and conditions', () => Alert.alert('Terms of Service', 'Opening terms of service...'), 'doc.fill')}
        </>
      ))}

      {/* Danger Zone */}
      {renderSettingsSection('Danger Zone', (
        <>
          {renderActionItem('Delete Account', 'Permanently delete your account and data', handleDeleteAccount, 'trash.fill', '#d32f2f')}
        </>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Flow v1.0.0</Text>
        <Text style={styles.footerSubtext}>© 2026 Flow. All rights reserved.</Text>
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
  goBack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goBackText: {
    color: '#111111',
    fontWeight: '600',
    marginLeft: 4,
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