import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, FontSizes } from '../constants/theme';

export default function BottomSheetModal({ 
  visible, 
  onClose, 
  title, 
  iconName = 'trash-outline', 
  iconColor = Colors.expense, 
  children,
  primaryBtnText,
  primaryBtnAction,
  primaryBtnColor = Colors.expense,
  primaryBtnIcon,
  secondaryBtnText = 'Batal'
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.sheetHandle} />
          
          <View style={styles.sheetIconRow}>
            <View style={[styles.sheetIconBox, { backgroundColor: iconColor + '20' }]}>
              <Ionicons name={iconName} size={26} color={iconColor} />
            </View>
          </View>
          
          <Text style={styles.sheetTitle}>{title}</Text>
          
          <View style={styles.sheetBodyContainer}>
            {children}
          </View>
          
          <View style={styles.sheetBtns}>
            <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
              <Text style={styles.btnSecondaryText}>{secondaryBtnText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.btnPrimary, { backgroundColor: primaryBtnColor }]} 
              onPress={primaryBtnAction}
            >
              {primaryBtnIcon && <Ionicons name={primaryBtnIcon} size={16} color="#fff" style={{marginRight: 6}} />}
              <Text style={styles.btnPrimaryText}>{primaryBtnText}</Text>
            </TouchableOpacity>
          </View>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, 
    justifyContent: 'flex-end', 
    backgroundColor: Colors.overlayDark 
  },
  sheet: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radius['3xl'],
    borderTopRightRadius: Radius['3xl'],
    padding: Spacing['2xl'],
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.textMuted,
    alignSelf: 'center', marginBottom: Spacing.xl,
  },
  sheetIconRow: { alignItems: 'center', marginBottom: Spacing.lg },
  sheetIconBox: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  sheetTitle: { 
    color: Colors.textPrimary, 
    fontSize: FontSizes['2xl'], 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: Spacing.md 
  },
  sheetBodyContainer: { marginBottom: Spacing['2xl'] },
  sheetBtns: { flexDirection: 'row', gap: Spacing.md },
  btnSecondary: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg,
    backgroundColor: Colors.bgElevated, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  btnSecondaryText: { color: Colors.textPrimary, fontSize: FontSizes.md, fontWeight: '600' },
  btnPrimary: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: FontSizes.md, fontWeight: '600' },
});
