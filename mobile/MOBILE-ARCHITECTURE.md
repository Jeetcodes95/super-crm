# React Native Mobile Architecture: Super CRM

## App Structure

```
mobile/
├── src/
│   ├── navigation/
│   │   ├── AppNavigator.tsx        # Root navigator (auth state)
│   │   ├── AuthNavigator.tsx       # Login, register screens
│   │   ├── AdminNavigator.tsx      # Bottom tab: admin views
│   │   ├── EmployeeNavigator.tsx   # Bottom tab: employee views
│   │   └── StudentNavigator.tsx    # Bottom tab: student views
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── admin/
│   │   │   ├── DashboardScreen.tsx
│   │   │   ├── LeadsScreen.tsx
│   │   │   ├── LeadDetailScreen.tsx
│   │   │   ├── TeamScreen.tsx
│   │   │   └── AnalyticsScreen.tsx
│   │   ├── employee/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── AttendanceScreen.tsx
│   │   │   ├── LeaveScreen.tsx
│   │   │   └── CoursesScreen.tsx
│   │   └── student/
│   │       ├── CourseListScreen.tsx
│   │       ├── CoursePlayerScreen.tsx
│   │       └── CertificatesScreen.tsx
│   ├── store/
│   │   ├── authStore.ts            # Zustand: user + token state
│   │   ├── crmStore.ts             # Zustand: leads, deals cache
│   │   └── offlineStore.ts         # Pending offline actions queue
│   ├── services/
│   │   ├── api.ts                  # Axios instance with interceptors
│   │   ├── tokenStorage.ts         # Expo SecureStore wrapper
│   │   └── offlineSync.ts          # NetInfo + background sync
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAttendance.ts
│   │   └── useNetwork.ts           # NetInfo connectivity hook
│   └── utils/
├── assets/
├── app.json
└── package.json
```

## Navigation Strategy

```typescript
// Role-based root navigator
export function AppNavigator() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <AuthNavigator />;

  switch (user.role) {
    case 'ORG_ADMIN':
    case 'MANAGER':
      return <AdminNavigator />;
    case 'EMPLOYEE':
      return <EmployeeNavigator />;
    case 'STUDENT':
      return <StudentNavigator />;
    default:
      return <EmployeeNavigator />;
  }
}
```

## Offline-First Architecture

```typescript
// services/offlineSync.ts
import NetInfo from '@react-native-community/netinfo';
import { useOfflineStore } from '../store/offlineStore';

export class OfflineSyncService {
  static async addPendingAction(action: OfflineAction) {
    const store = useOfflineStore.getState();
    store.addPendingAction({ ...action, id: uuid(), timestamp: Date.now() });
  }

  static async syncPendingActions() {
    const { pendingActions, removePendingAction } = useOfflineStore.getState();

    for (const action of pendingActions) {
      try {
        await apiService[action.type](action.payload);
        removePendingAction(action.id);
      } catch (error) {
        console.warn('Sync failed for action:', action.id, error);
      }
    }
  }
}

// Listen for network reconnection
NetInfo.addEventListener((state) => {
  if (state.isConnected && state.isInternetReachable) {
    OfflineSyncService.syncPendingActions();
  }
});
```

## Attendance Check-In (Geofenced)

```typescript
// screens/employee/AttendanceScreen.tsx
import * as Location from 'expo-location';

async function handleCheckIn() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission denied', 'Location access is required for check-in.');
    return;
  }

  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

  await attendance.checkIn({
    location: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    },
    timestamp: new Date().toISOString(),
  });
}
```

## Push Notifications

```typescript
// Expo Notifications + FCM
import * as Notifications from 'expo-notifications';

async function registerForPushNotifications(userId: string) {
  const token = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });
  await api.users.updatePushToken(userId, token.data);
}

// Server-side push (Node.js) via expo-server-sdk
import Expo from 'expo-server-sdk';

export async function sendPush(expoPushToken: string, title: string, body: string) {
  const expo = new Expo();
  await expo.sendPushNotificationsAsync([{
    to: expoPushToken,
    title,
    body,
    sound: 'default',
  }]);
}
```

## Token Storage (Secure)

```typescript
import * as SecureStore from 'expo-secure-store';

export const tokenStorage = {
  setAccessToken: (token: string) => SecureStore.setItemAsync('access_token', token),
  getAccessToken: () => SecureStore.getItemAsync('access_token'),
  setRefreshToken: (token: string) => SecureStore.setItemAsync('refresh_token', token),
  clear: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
  },
};
```
