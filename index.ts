import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

import App from './App';

// Ruido benigno de @supabase/gotrue-js: al arrancar sin una sesión válida
// guardada, el cliente intenta refrescar y reporta este console.error. No es
// un fallo de la app (la app va a la pantalla de login); lo silenciamos para
// que el overlay de LogBox no confunda en desarrollo.
LogBox.ignoreLogs(['Invalid Refresh Token: Refresh Token Not Found']);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
