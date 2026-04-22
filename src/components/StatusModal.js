import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { FontSizes, Radius, Spacing } from '../constants/theme';

export default function StatusModal({ visible, onClose, title, message, type = 'info' }) {
  const { colors } = useAppContext();
  let iconName = 'information-circle';
  let iconColor = colors.info;

  if (type === 'error') {
    iconName = 'alert-circle';
    iconColor = colors.expense;
  } else if (type === 'success') {
    iconName = 'checkmark-circle';
    iconColor = colors.income;
  } else if (type === 'warning') {
    iconName = 'warning';
    iconColor = colors.warning;
  }

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <LinearGradient
          colors={[colors.bgCard, colors.bgElevated]}
          style={[styles.dialog, { borderColor: colors.border }]}
        >
          <View style={[styles.iconCircle, { backgroundColor: iconColor + '1a' }]}>
            <Ionicons name={iconName} size={36} color={iconColor} />
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: iconColor }]} onPress={handleClose}>
            <Text style={styles.btnText}>Lanjutkan</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius['2xl'],
    padding: Spacing['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  btn: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: FontSizes.md, fontWeight: 'bold' },
});