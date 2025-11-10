import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useCart } from '@/context/CartContext';

export default function WelcomeScreen() {
  const { createCart } = useCart();
  const [isCreatingCart, setIsCreatingCart] = useState(false);

  const handleStartShopping = async () => {
    try {
      setIsCreatingCart(true);
      
      // Create a new cart session in the database before navigation
      await createCart();
      
      // Navigate to cart screen after cart is created
      router.push('/cart');
    } catch (error) {
      console.error('Error creating cart:', error);
      Alert.alert(
        'Error', 
        'Failed to create cart session. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreatingCart(false);
    }
  };

  return (
    <LinearGradient
      colors={['#E8F4FD', '#D4E8F5']}
      style={styles.container}
      accessible={true}
      accessibilityLabel="Welcome screen"
    >
      <View style={styles.content}>
        <Text 
          style={styles.title}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel="Welcome title"
        >
          Welcome!
        </Text>
        <Text 
          style={styles.subtitle}
          accessible={true}
          accessibilityLabel="Ready to start shopping question"
        >
          Ready to start shopping?
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, isCreatingCart && styles.buttonDisabled]}
          onPress={handleStartShopping}
          disabled={isCreatingCart}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Start shopping button"
          accessibilityHint="Creates a new cart session and navigates to the shopping cart"
        >
          {isCreatingCart ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#FFFFFF" style={styles.spinner} />
              <Text style={styles.buttonText}>Creating Cart...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Start Shopping</Text>
          )}
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
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 24,
    color: '#7F8C8D',
    marginBottom: 60,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#95A5A6',
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
}); 