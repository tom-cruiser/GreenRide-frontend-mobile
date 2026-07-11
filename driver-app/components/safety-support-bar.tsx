import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function SafetySupportBar({ onEmergency, onSupport }) {
  return (
    <View style={styles.bar}>
      <TouchableOpacity style={styles.btn} onPress={onEmergency}>
        <Text style={styles.btnText}>Emergency</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={onSupport}>
        <Text style={styles.btnText}>Support</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  btn: {
    backgroundColor: '#43a047',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
