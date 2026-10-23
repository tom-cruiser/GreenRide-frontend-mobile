import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text, TextInputFlow as TextInput, IconButton } from '@/design';
import { useRouter } from 'expo-router';
import AppLogo from '../components/app-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useT, type TKey } from '@/i18n';

export default function SupportScreen() {
  const router = useRouter();
  const { t } = useT();
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);
  const [supportMessage, setSupportMessage] = useState('');

  const faqData = [1, 2, 3, 4, 5, 6].map((n) => ({
    question: t(`support.q${n}` as TKey),
    answer: t(`support.a${n}` as TKey),
  }));

  const supportCategories = [
    { title: t('support.catAccount'), icon: 'person.circle.fill', description: t('support.catAccountText') },
    { title: t('support.catPayment'), icon: 'creditcard.fill', description: t('support.catPaymentText') },
    { title: t('support.catRide'), icon: 'car.fill', description: t('support.catRideText') },
    { title: t('support.catSafety'), icon: 'shield.fill', description: t('support.catSafetyText') },
  ] as const;

  const handleFaqPress = (index: number) => {
    setSelectedFaq(selectedFaq === index ? null : index);
  };

  const handleSubmitSupport = () => {
    if (supportMessage.trim()) {
      Alert.alert(
        t('support.sent'),
        t('support.sentText'),
        [{ text: t('common.ok'), onPress: () => setSupportMessage('') }]
      );
    } else {
      Alert.alert(t('history.error'), t('support.empty'));
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
        <IconButton icon="chevron-left" label={t('common.back')} onPress={() => router.back()} />
      </View>
        <AppLogo size={40} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>{t('support.title')}</Text>
        <Text style={styles.subtitle}>{t('support.subtitle')}</Text>
      </View>

      {/* Quick Support Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('support.quick')}</Text>
        {supportCategories.map((category, index) => (
          <TouchableOpacity
            key={index}
            style={styles.categoryItem}
            onPress={() => Alert.alert(category.title, t('settings.soon'))}
          >
            <View style={styles.categoryIcon}>
              <IconSymbol name={category.icon} size={24} color="#1976d2" />
            </View>
            <View style={styles.categoryContent}>
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categoryDescription}>{category.description}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#888" />
          </TouchableOpacity>
        ))}
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('support.faq')}</Text>
        {faqData.map((faq, index) => (
          <View key={index} style={styles.faqItem}>
            <TouchableOpacity
              style={styles.faqQuestion}
              onPress={() => handleFaqPress(index)}
            >
              <Text style={styles.faqQuestionText}>{faq.question}</Text>
              <IconSymbol
                name={selectedFaq === index ? 'chevron.up' : 'chevron.down'}
                size={16}
                color="#888"
              />
            </TouchableOpacity>
            {selectedFaq === index && (
              <View style={styles.faqAnswer}>
                <Text style={styles.faqAnswerText}>{faq.answer}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Contact Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('support.contact')}</Text>
        <Text style={styles.supportDescription}>
          {t('support.contactText')}
        </Text>
        
        <TextInput
          style={styles.messageInput}
          placeholder={t('support.placeholder')}
          value={supportMessage}
          onChangeText={setSupportMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitSupport}>
          <Text style={styles.submitButtonText}>{t('support.submit')}</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Information */}
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>{t('support.other')}</Text>
        
        <TouchableOpacity style={styles.contactItem}>
          <IconSymbol name="phone.fill" size={20} color="#111111" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>{t('support.phone')}</Text>
            <Text style={styles.contactValue}>+257 79 000 000</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactItem}>
          <IconSymbol name="envelope.fill" size={20} color="#111111" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>{t('support.email')}</Text>
            <Text style={styles.contactValue}>support@greenrider.bi</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactItem}>
          <IconSymbol name="clock.fill" size={20} color="#111111" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>{t('support.hours')}</Text>
            <Text style={styles.contactValue}>{t('support.always')}</Text>
          </View>
        </TouchableOpacity>
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
    color: '#1976d2',
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
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  faqAnswer: {
    paddingBottom: 16,
    paddingRight: 24,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  supportDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactSection: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 16,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contactInfo: {
    marginLeft: 12,
  },
  contactLabel: {
    fontSize: 14,
    color: '#666',
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
});