import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ReceiptScreen() {
  const handleContinue = () => {
    router.push('/thank-you');
  };

  return (
    <LinearGradient
      colors={['#F0F8FF', '#E6F3FF']}
      style={styles.container}
      accessible={true}
      accessibilityLabel="Receipt confirmation screen"
    >
      <View 
        style={styles.content}
        accessible={true}
        accessibilityLabel="Receipt confirmation content"
      >
        <View 
          style={styles.iconContainer}
          accessible={true}
          accessibilityLabel="Envelope icon container"
        >
          <View 
            style={styles.envelopeIcon}
            accessible={true}
            accessibilityLabel="Envelope icon"
          >
            <Text style={styles.envelopeSymbol}>✉️</Text>
          </View>
        </View>
        
        <Text 
          style={styles.title}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel="Receipt sent confirmation"
        >
          Receipt Sent!
        </Text>
        
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Continue button"
          accessibilityHint="Proceeds to thank you screen"
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 32,
  },
  envelopeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
  },
  envelopeSymbol: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498DB',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6C757D',
    marginBottom: 8,
    textAlign: 'center',
  },
  email: {
    fontSize: 18,
    color: '#3498DB',
    marginBottom: 48,
    textAlign: 'center',
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 