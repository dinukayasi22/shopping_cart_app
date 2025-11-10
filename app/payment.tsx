import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Alert, Dimensions, TouchableOpacity } from 'react-native';
import { useCart } from '@/context/CartContext';
import { PaymentData } from '@/services/api';
import QRCode from 'react-native-qrcode-svg';

export default function PaymentScreen() {
  const { cart, createPayment } = useCart();
  const [isProcessing, setIsProcessing] = useState(true);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showQR, setShowQR] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60); // 60 seconds

  useEffect(() => {
    const initializePayment = async () => {
      try {
        if (!cart) {
          setError('No cart available');
          setIsProcessing(false);
          return;
        }

        // Create payment in Firebase
        const payment = await createPayment(cart.totalAmount);
        setPaymentData(payment);

        // Generate QR code data from cart
        const qrData = {
          transactionId: payment.transactionId,
          cartId: cart.id,
          totalAmount: cart.totalAmount,
          itemCount: cart.items.length,
          items: cart.items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            totalPrice: item.totalPrice
          })),
          timestamp: new Date().toISOString(),
          status: 'pending'
        };

        const qrJsonString = JSON.stringify(qrData, null, 2);
        setQrCodeData(qrJsonString);
        console.log('QR Code Data:', qrJsonString);

        // Show QR code for 1 minute
        setShowQR(true);
        setIsProcessing(false);

        // Countdown timer
        const timer = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setShowQR(false);
              // Navigate to next screen after QR display
              setTimeout(() => {
                router.push('/mobile-input');
              }, 1000);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(timer);

      } catch (err) {
        console.error('Payment error:', err);
        setError(err instanceof Error ? err.message : 'Failed to create payment');
        setIsProcessing(false);
      }
    };

    initializePayment();
  }, [cart, createPayment]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (isProcessing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3498DB" />
        <Text style={styles.loadingText}>Initializing payment...</Text>
      </View>
    );
  }

  if (!paymentData || !cart) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No payment or cart data available</Text>
      </View>
    );
  }

  return (
    <View 
      style={styles.container}
      accessible={true}
      accessibilityRole="header"
      accessibilityLabel="Payment processing screen"
    >
      <Text 
        style={styles.title}
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel="Complete your payment title"
      >
        Complete Your Payment
      </Text>
      
      {showQR ? (
        <View 
          style={styles.qrCard}
          accessible={true}
          accessibilityLabel="QR code card"
        >
          <View 
            style={styles.qrCode}
            accessible={true}
            accessibilityLabel="QR code for payment"
          >
            {/* QR Code Display */}
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrTitle}>QR Code</Text>
              
              {/* Generated QR Code Pattern */}
              <View style={styles.qrCodePattern}>
                <QRCode
                  value={qrCodeData}
                  size={250}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                />
              </View>
            </View>
          </View>
          
          {/* Amount displayed below QR code, centered */}
          <Text style={styles.qrAmount}>Rs. {cart.totalAmount.toFixed(2)}</Text>
          
          <Text 
            style={styles.processingText}
            accessible={true}
            accessibilityLabel="QR code display status"
          >
            QR Code Active - Ready for scanning
          </Text>
          
          <Text style={styles.qrInstruction}>
            Scan this QR code with your mobile device to complete payment
          </Text>
          
          {/* Copy QR Data Button - Commented out as requested */}
          {/* <TouchableOpacity 
            style={styles.copyButton}
            onPress={() => {
              // In a real app, you'd use Clipboard API
              console.log('QR Code Data copied to console:', qrCodeData);
              Alert.alert('Copied!', 'QR Code data copied to console for testing');
            }}
          >
            <Text style={styles.copyButtonText}>📋 Copy QR Data</Text>
          </TouchableOpacity> */}
        </View>
      ) : (
        <View style={styles.processingCard}>
          <ActivityIndicator size="large" color="#3498DB" />
          <Text style={styles.processingText}>Processing payment...</Text>
        </View>
      )}
      
      <View style={styles.paymentInfo}>
        <Text style={styles.infoTitle}>Payment Details:</Text>
        <Text style={styles.infoText}>Amount: Rs. {cart.totalAmount.toFixed(2)}</Text>
        <Text style={styles.infoText}>Items: {cart.items.length}</Text>
        <Text style={styles.infoText}>Transaction ID: {paymentData.transactionId}</Text>
        <Text style={styles.infoText}>Status: {paymentData.status}</Text>
        <Text style={styles.infoText}>Cart ID: {paymentData.cartId}</Text>
      </View>
      
      <Text 
        style={styles.instruction}
        accessible={true}
        accessibilityLabel="Instructions to scan QR code with mobile device"
      >
        {showQR 
          ? 'QR Code is ready for scanning'
          : 'Payment processing...'
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#2C3E50',
  },
  errorText: {
    fontSize: 18,
    color: '#E74C3C',
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 40,
    textAlign: 'center',
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
    elevation: 8,
    marginBottom: 40,
    width: '100%',
    maxWidth: 400,
  },
  qrCode: {
    marginBottom: 24,
  },
  qrPlaceholder: {
    width: 250,
    height: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8F4FD',
    padding: 20,
    position: 'relative',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  qrTitle: {
    color: '#2C3E50',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  qrAmount: {
    color: '#27AE60',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  processingText: {
    fontSize: 18,
    color: '#2C3E50',
    marginBottom: 16,
    fontWeight: '600',
  },
  loadingSpinner: {
    marginTop: 8,
  },
  paymentInfo: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 3,
    width: '100%',
    maxWidth: 400,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 4,
  },
  instruction: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 24,
  },
  qrInstruction: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 16,
  },
  processingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
    elevation: 5,
    marginBottom: 40,
  },
  qrCodePattern: {
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 2,
    borderRadius: 4,
  },
  qrRow: {
    flexDirection: 'row',
    height: 6,
  },
  qrCell: {
    fontSize: 6,
    fontWeight: 'bold',
    width: 6,
    height: 6,
    textAlign: 'center',
    lineHeight: 6,
  },
  copyButton: {
    backgroundColor: '#3498DB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 