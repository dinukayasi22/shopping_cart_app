import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function MobileInputScreen() {
  const [mobileNumber, setMobileNumber] = useState('077XXXXXXX');

  const handleContinue = () => {
    router.push('/receipt');
  };

  return (
    <LinearGradient
      colors={['#E8F5E8', '#D4E8D4']}
      style={styles.container}
      accessible={true}
      accessibilityLabel="Mobile number input screen"
    >
      <View 
        style={styles.modal}
        accessible={true}
        accessibilityLabel="Mobile number input form"
      >
        <Text 
          style={styles.title}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel="Enter mobile number title"
        >
          Enter Mobile Number
        </Text>
        <Text 
          style={styles.subtitle}
          accessible={true}
          accessibilityLabel="Instructions for mobile number input"
        >
          Please enter your mobile number to receive the receipt
        </Text>
        
        <View 
          style={styles.inputContainer}
          accessible={true}
          accessibilityLabel="Mobile number input field"
        >
          <Text 
            style={styles.inputLabel}
            accessible={true}
            accessibilityLabel="Mobile number label"
          >
            Mobile Number
          </Text>
          <TextInput
            style={styles.input}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            placeholder="077XXXXXXX"
            placeholderTextColor="#BDC3C7"
            keyboardType="phone-pad"
            accessible={true}
            accessibilityLabel="Mobile number input"
            accessibilityHint="Enter your mobile number to receive receipt"
          />
        </View>
        
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Continue button"
          accessibilityHint="Proceeds to receipt screen"
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
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#BDC3C7',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2C3E50',
    backgroundColor: '#FFFFFF',
  },
  continueButton: {
    backgroundColor: '#6C757D',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 