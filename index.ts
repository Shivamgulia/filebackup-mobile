// Custom entry point (Expo Router): register side-effects first, then the router entry last.
// Defines the background sync task at launch (before any registration attempt).
import './src/background';

import 'expo-router/entry';
