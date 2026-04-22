import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppContext } from '../context/AppContext';
import { FontSizes, Radius, Spacing } from '../constants/theme';

export default function BottomSheetModal({
  visible,
  onClose,
  title,
  iconName = 'trash-outline',
  iconColor,
  children,
  primaryBtnText = 'Konfirmasi',
  primaryBtnAction,
  primaryBtnColor,
  primaryBtnIcon,
  secondaryBtnText = 'Batal',
}) {
  const { colors } = useAppContext();
  const effectiveIconColor = iconColor || colors.expense;
  const effectivePrimaryBtnColor = primaryBtnColor || colors.expense;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Pressable overlay: tap di luar sheet = tutup */}
      <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* stopPropagation agar tap di dalam sheet tidak trigger onClose */}
          <Pressable style={[styles.sheet, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={e => e.stopPropagation()}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.textMuted }]} />

            <View style={styles.sheetIconRow}>
              <View style={[styles.sheetIconBox, { backgroundColor: effectiveIconColor + '20' }]}>
                <Ionicons name={iconName} size={26} color={effectiveIconColor} />
              </View>
            </View>

            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{title}</Text>

            <View style={styles.sheetBodyContainer}>
              {children}
            </View>

            <View style={styles.sheetBtns}>
              <TouchableOpacity style={[styles.btnSecondary, { backgroundColor: colors.bgElevated, borderColor: colors.border }]} onPress={onClose}>
                <Text style={[styles.btnSecondaryText, { color: colors.textPrimary }]}>{secondaryBtnText}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: effectivePrimaryBtnColor }]}
                onPress={primaryBtnAction}
              >
                {primaryBtnIcon && (
                  <Ionicons name={primaryBtnIcon} size={16} color="#fff" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.btnPrimaryText}>{primaryBtnText}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius['3xl'],
    borderTopRightRadius: Radius['3xl'],
    padding: Spacing['2xl'],
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: Spacing.xl,
  },
  sheetIconRow: { alignItems: 'center', marginBottom: Spacing.lg },
  sheetIconBox: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  sheetTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  sheetBodyContainer: { marginBottom: Spacing['2xl'] },
  sheetBtns: { flexDirection: 'row', gap: Spacing.md },
  btnSecondary: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnSecondaryText: { fontSize: FontSizes.md, fontWeight: '600' },
  btnPrimary: {
    flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: FontSizes.md, fontWeight: '600' },
});