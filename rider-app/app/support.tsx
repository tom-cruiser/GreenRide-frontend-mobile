import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Text, TextInputFlow as TextInput } from '@/design';
import { useRouter } from 'expo-router';
import AppLogo from '../components/app-logo';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SupportScreen() {
  const router = useRouter();
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);
  const [supportMessage, setSupportMessage] = useState('');

  const faqData = [
    {
      question: 'How do I book a ride?',
      answer: 'Tap the "Book Ride" button on the home screen, enter your pickup and destination locations, review the fare estimate, and confirm your booking.',
    },
    {
      question: 'How is the fare calculated?',
      answer: 'Fares are calculated at 7,000 FBU per kilometer with a minimum fare for short trips. Additional charges may apply during surge pricing periods.',
    },
    {
      question: 'Can I pay with cash?',
      answer: 'Currently, we only accept digital payments through the wallet system. You can top up your wallet using mobile money or bank transfers.',
    },
    {
      question: 'How do I contact my driver?',
      answer: 'Once your ride is confirmed, you can use the in-app messaging feature or call your driver directly through the app.',
    },
    {
      question: 'What if I forget something in the vehicle?',
      answer: 'Contact customer support immediately with your ride details. We will help you get in touch with your driver to retrieve lost items.',
    },
    {
      question: 'How do I cancel a ride?',
      answer: 'You can cancel a ride from the active ride screen. Cancellation charges may apply depending on the timing of cancellation.',
    },
  ];

  const supportCategories = [
    {
      title: 'Account & Profile',
      icon: 'person.circle.fill',
      description: 'Account settings, profile updates, verification',
    },
    {
      title: 'Payment & Wallet',
      icon: 'creditcard.fill',
      description: 'Payment issues, wallet top-up, refunds',
    },
    {
      title: 'Ride Issues',
      icon: 'car.fill',
      description: 'Ride problems, driver issues, route concerns',
    },
    {
      title: 'Safety Concerns',
      icon: 'shield.fill',
      description: 'Safety reports, emergency situations',
    },
  ] as const;

  const handleFaqPress = (index: number) => {
    setSelectedFaq(selectedFaq === index ? null : index);
  };

  const handleSubmitSupport = () => {
    if (supportMessage.trim()) {
      Alert.alert(
        'Support Request Submitted',
        'Thank you for contacting us. Our support team will respond within 24 hours.',
        [{ text: 'OK', onPress: () => setSupportMessage('') }]
      );
    } else {
      Alert.alert('Error', 'Please enter your message before submitting.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.goBack} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#1976d2" />
          <Text style={styles.goBackText}>Back</Text>
        </TouchableOpacity>
        <AppLogo size={40} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.subtitle}>We&apos;re here to help you</Text>
      </View>

      {/* Quick Support Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Support</Text>
        {supportCategories.map((category, index) => (
          <TouchableOpacity
            key={index}
            style={styles.categoryItem}
            onPress={() => Alert.alert(category.title, 'This will open a detailed support form')}
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
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
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
        <Text style={styles.sectionTitle}>Contact Support</Text>
        <Text style={styles.supportDescription}>
          Can&apos;t find what you&apos;re looking for? Send us a message and we&apos;ll get back to you.
        </Text>
        
        <TextInput
          style={styles.messageInput}
          placeholder="Describe your issue or question..."
          value={supportMessage}
          onChangeText={setSupportMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
        
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitSupport}>
          <Text style={styles.submitButtonText}>Submit Support Request</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Information */}
      <View style={styles.contactSection}>
        <Text style={styles.contactTitle}>Other Ways to Reach Us</Text>
        
        <TouchableOpacity style={styles.contactItem}>
          <IconSymbol name="phone.fill" size={20} color="#111111" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Phone Support</Text>
            <Text style={styles.contactValue}>+257 79 000 000</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactItem}>
          <IconSymbol name="envelope.fill" size={20} color="#111111" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Email Support</Text>
            <Text style={styles.contactValue}>support@greenrider.bi</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactItem}>
          <IconSymbol name="clock.fill" size={20} color="#111111" />
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Support Hours</Text>
            <Text style={styles.contactValue}>24/7 Available</Text>
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
  goBack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goBackText: {
    color: '#1976d2',
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