import { useCart } from '@/context/CartContext';
import apiService from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ThankYouScreen() {
  const { cart } = useCart();

  // Mark cart as completed when user reaches thank you screen
  useEffect(() => {
    const completeCart = async () => {
      if (cart) {
        try {
          await apiService.updateCartStatus(cart.id, 'completed');
          console.log('Cart marked as completed:', cart.id);
        } catch (error) {
          console.error('Error completing cart:', error);
        }
      }
    };

    completeCart();
  }, [cart]);

  const handleRestart = () => {
    router.push('/');
  };

  return (
    <LinearGradient
      colors={['#F8F0FF', '#F0E6FF']}
      style={styles.container}
      accessible={true}
      accessibilityLabel="Thank you screen"
    >
      <View 
        style={styles.content}
        accessible={true}
        accessibilityLabel="Thank you content"
      >
        <View 
          style={styles.iconContainer}
          accessible={true}
          accessibilityLabel="Heart icon container"
        >
          <View 
            style={styles.heartIcon}
            accessible={true}
            accessibilityLabel="Heart icon"
          >
            <Text style={styles.heartSymbol}>❤️</Text>
          </View>
        </View>
        
        <Text 
          style={styles.title}
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel="Thank you title"
        >
          Thank You!
        </Text>
        <Text 
          style={styles.subtitle}
          accessible={true}
          accessibilityLabel="Come again soon message"
        >
          Come Again Soon!
        </Text>
        <Text 
          style={styles.message}
          accessible={true}
          accessibilityLabel="Appreciation message"
        >
          We appreciate your visit
        </Text>
        
        <TouchableOpacity 
          style={styles.restartButton}
          onPress={handleRestart}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Start new order button"
          accessibilityHint="Returns to welcome screen to start a new order"
        >
          <Text style={styles.restartButtonText}>Start New Order</Text>
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
  heartIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#9B59B6',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    borderWidth: 2,
    borderColor: '#E8D5F0',
  },
  heartSymbol: {
    fontSize: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#9B59B6',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 24,
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  message: {
    fontSize: 18,
    color: '#2C3E50',
    marginBottom: 48,
    textAlign: 'center',
  },
  restartButton: {
    backgroundColor: '#9B59B6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  restartButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 