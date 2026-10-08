import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Text, TextInputFlow as TextInput } from '@/design';
import { useRouter } from 'expo-router';
import { BackButton, ui } from '@/components/friends-ui';

// "Join a ride": enter the code a friend shared (e.g. FLOW-4K7P).
export default function JoinScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const go = () => code.trim() && router.push(`/join/${encodeURIComponent(code.trim().toUpperCase())}`);
  return (
    <ScrollView style={ui.page} contentContainerStyle={ui.container} keyboardShouldPersistTaps="handled">
      <BackButton onPress={() => router.replace('/(tabs)')} />
      <View style={ui.statusCard}>
        <Text style={ui.title}>Join a ride</Text>
        <Text style={ui.detail}>Enter the code your friend sent you.</Text>
      </View>
      <TextInput
        style={[ui.input, { fontSize: 24, textAlign: 'center', letterSpacing: 3 }]}
        placeholder="FLOW-4K7P"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="characters"
        autoCorrect={false}
        value={code}
        onChangeText={setCode}
        onSubmitEditing={go}
      />
      <TouchableOpacity style={[ui.primaryBtn, !code.trim() && ui.disabled]} onPress={go} disabled={!code.trim()}>
        <Text style={ui.primaryBtnText}>Find the ride</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
