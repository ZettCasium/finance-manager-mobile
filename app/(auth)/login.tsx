import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from '@/utils/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleAuth = async () => {
    if (!email || (!isRegister && !password && !message)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isRegister) {
        const { data, error: regError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (regError) throw regError;
        
        if (data.user && data.session) {
            // User is signed in
        } else if (data.user) {
            Alert.alert('Success', 'Check your email for confirmation link!');
        }
      } else {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (loginError) throw new Error('Invalid email or password');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email first.');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert('Success', 'Password reset link has been sent to your email!');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: isDark ? '#09090b' : '#fafafa' }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: isDark ? '#18181b' : '#ffffff', borderColor: isDark ? '#27272a' : '#e4e4e7' }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? '#fafafa' : '#18181b' }]}>FinanceFlow</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#a1a1aa' : '#71717a' }]}>
              {isRegister ? 'Create a new account' : 'Welcome back'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: isDark ? '#d4d4d8' : '#3f3f46' }]}>Email</Text>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#27272a' : '#ffffff', borderColor: isDark ? '#3f3f46' : '#d4d4d8' }]}>
                <Ionicons name="mail-outline" size={20} color="#a1a1aa" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: isDark ? '#ffffff' : '#000000' }]}
                  placeholder="email@example.com"
                  placeholderTextColor="#a1a1aa"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: isDark ? '#d4d4d8' : '#3f3f46' }]}>Password</Text>
                {!isRegister && (
                  <TouchableOpacity onPress={handleResetPassword}>
                    <Text style={[styles.forgotText, { color: '#059669' }]}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#27272a' : '#ffffff', borderColor: isDark ? '#3f3f46' : '#d4d4d8' }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#a1a1aa" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: isDark ? '#ffffff' : '#000000' }]}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#a1a1aa"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  minLength={6}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#059669' }]}
              onPress={handleAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>{isRegister ? 'Register' : 'Sign in'}</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsRegister(!isRegister);
              setMessage(null);
            }}
          >
            <Text style={[styles.switchText, { color: '#059669' }]}>
              {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  button: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
