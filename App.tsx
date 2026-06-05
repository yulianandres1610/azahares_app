import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppFonts } from './src/theme/fonts';
import { colors } from './src/theme/tokens';
import { AppProvider, useApp } from './src/store/AppContext';
import { ToastHost } from './src/components/ui';
import { Splash, Login, Forgot, OTP, Biometric, Pending } from './src/screens/auth/AuthScreens';
import { MainShell } from './src/screens/app/MainShell';

type AuthSub = 'login' | 'forgot' | 'biometric';

function Root() {
  const { phase, toast, signOut, unlock, configOk, showToast, t } = useApp();
  const [sub, setSub] = useState<AuthSub>('login');
  const [minSplash, setMinSplash] = useState(true);

  // mantiene el splash visible un mínimo para mostrar la animación
  useEffect(() => {
    const tm = setTimeout(() => setMinSplash(false), 1900);
    return () => clearTimeout(tm);
  }, []);

  useEffect(() => {
    if (phase === 'unauth') setSub('login');
  }, [phase]);

  useEffect(() => {
    if (!configOk) showToast(t('configMissing'), 'warn');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configOk]);

  let content: React.ReactNode;
  let dark = true;

  if (phase === 'loading' || minSplash) {
    content = <Splash />;
  } else if (phase === 'unauth') {
    if (sub === 'forgot') content = <Forgot onBack={() => setSub('login')} />;
    else if (sub === 'biometric')
      content = <Biometric onCancel={() => setSub('login')} onSuccess={async () => unlock()} />;
    else content = <Login onForgot={() => setSub('forgot')} onBiometric={() => setSub('biometric')} />;
  } else if (phase === 'locked') {
    content = <Biometric onCancel={() => signOut()} onSuccess={async () => unlock()} />;
  } else if (phase === 'otp') {
    content = <OTP />;
  } else if (phase === 'pending') {
    content = <Pending />;
  } else {
    content = <MainShell />;
    dark = false;
  }

  return (
    <View style={{ flex: 1, backgroundColor: dark ? colors.navy900 : colors.bg }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {content}
      <ToastHost toast={toast} />
    </View>
  );
}

export default function App() {
  const fontsLoaded = useAppFonts();
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.navy900 }} />;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Root />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
