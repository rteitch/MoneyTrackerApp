import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, FontSizes } from '../constants/theme';

export default function StatusModal({ visible, onClose, title, message, type = 'info' }) {
  let iconName = 'information-circle';
  let iconColor = Colors.info;

  if (type === 'error') {
    iconName = 'alert-circle';
    iconColor = Colors.expense;
  } else if (type === 'success') {
    iconName = 'checkmark-circle';
    iconColor = Colors.income;
  } else if (type === 'warning') {
    iconName = 'warning';
    iconColor = Colors.warning;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Ionicons name={iconName} size={48} color={iconColor} style={styles.icon} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: iconColor }]} onPress={onClose}>
            <Text style={styles.btnText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: Colors.overlay,
    padding: Spacing.xl,
  },
  dialog: {
    width: '100%', 
    maxWidth: 320, 
    backgroundColor: Colors.bgCard, 
    borderRadius: Radius['2xl'], 
    padding: Spacing['2xl'], 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  icon: { marginBottom: Spacing.md },
  title: { 
    color: Colors.textPrimary, 
    fontSize: FontSizes.xl, 
    fontWeight: 'bold', 
    marginBottom: Spacing.sm, 
    textAlign: 'center' 
  },
  message: { 
    color: Colors.textSecondary, 
    fontSize: FontSizes.md, 
    textAlign: 'center', 
    lineHeight: 20, 
    marginBottom: Spacing.xl 
  },
  btn: { 
    width: '100%', 
    padding: Spacing.md, 
    borderRadius: Radius.lg, 
    alignItems: 'center' 
  },
  btnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: 'bold' },
});
