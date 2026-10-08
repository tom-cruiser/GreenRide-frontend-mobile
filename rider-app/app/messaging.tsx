import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

type ChatMessage = {
  id: number;
  text: string;
  sender: 'driver' | 'user';
  timestamp: string;
};

export default function MessagingScreen() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      text: 'Hello! I\'m your driver Jean Pierre. I\'ll be arriving in about 3 minutes.',
      sender: 'driver',
      timestamp: '10:25 AM',
    },
    {
      id: 2,
      text: 'Great! I\'m waiting near the main entrance.',
      sender: 'user',
      timestamp: '10:26 AM',
    },
    {
      id: 3,
      text: 'Perfect! I see you now. I\'m in the white Toyota.',
      sender: 'driver',
      timestamp: '10:28 AM',
    },
  ]);

  const sendMessage = () => {
    if (message.trim()) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMessage: ChatMessage = {
        id: messages.length + 1,
        text: message,
        sender: 'user',
        timestamp: now,
      };
      setMessages((prev) => [...prev, newMessage]);
      setMessage('');
      
      // Simulate driver response
      setTimeout(() => {
        const driverResponse: ChatMessage = {
          id: messages.length + 2,
          text: 'Message received! Thanks for the update.',
          sender: 'driver',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, driverResponse]);
      }, 2000);
    }
  };

  const renderMessage = (msg: ChatMessage) => (
    <View
      key={msg.id}
      style={[
        styles.messageContainer,
        msg.sender === 'user' ? styles.userMessage : styles.driverMessage,
      ]}
    >
      <Text style={[
        styles.messageText,
        msg.sender === 'driver' && { color: '#333' }
      ]}>{msg.text}</Text>
      <Text style={[
        styles.timestamp,
        msg.sender === 'driver' && { color: '#999' }
      ]}>{msg.timestamp}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.goBack} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#1976d2" />
          <Text style={styles.goBackText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Chat with Driver</Text>
          <Text style={styles.headerSubtitle}>Jean Pierre • Online</Text>
        </View>
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => Alert.alert('Calling', 'Calling Jean Pierre...')}
        >
          <IconSymbol name="phone.fill" size={20} color="#111111" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        {messages.map(renderMessage)}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={300}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <IconSymbol name="paperplane.fill" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  goBack: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  goBackText: {
    color: '#1976d2',
    fontWeight: '600',
    marginLeft: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#111111',
    marginTop: 2,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContent: {
    paddingVertical: 20,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    backgroundColor: '#1976d2',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  driverMessage: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: '#e0e0e0',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Remove the duplicate style definition at the end