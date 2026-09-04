import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';

import { authErrorMiddleware } from './middleware/authErrorMiddleware';
import authSlice from './slices/authSlice';

// Единственный экземпляр RTK Query. Все прежние 31 слайса теперь добавляют
// свои эндпоинты в него через injectEndpoints (см. store/api/baseApi.ts), но
// сами файлы и имена хуков не изменились — импортировать их нужно оттуда же,
// откуда и раньше. Достаточно импортировать их ради побочного эффекта
// регистрации, что и делает строка ниже.
import { baseApi } from './api/baseApi';
import './api/registerEndpoints';

const persistConfig = {
  key: 'leadflow',
  version: 1,
  storage,
  // Кэш запросов намеренно не персистится: сохраняется только auth.
  whitelist: ['auth'],
  blacklist: [],
};

const rootReducer = combineReducers({
  auth: authSlice,
  [baseApi.reducerPath]: baseApi.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
          // Ответы с Blob (PDF накладных, выгрузки Excel, QR-коды) не
          // сериализуемы — раньше эти пути перечислялись отдельно для
          // catalogApi и suppliesApi, теперь достаточно одного префикса.
          'api/executeQuery/fulfilled',
          'api/executeQuery/pending',
          'api/executeQuery/rejected',
          'api/executeMutation/fulfilled',
          'api/executeMutation/pending',
          'api/executeMutation/rejected',
          'api/subscriptions/unsubscribeQueryResult',
        ],
        ignoredPaths: ['api.queries', 'api.mutations', 'api.subscriptions'],
        ignoredActionPaths: [
          'payload',
          'meta.arg',
          'meta.baseQueryMeta',
          'meta.request',
          'meta.response',
        ],
        isSerializable: (value: unknown) => {
          if (value instanceof Blob) return false;
          if (value instanceof File) return false;
          return true;
        },
      },
      immutableCheck: import.meta.env.DEV,
    }).concat(authErrorMiddleware, baseApi.middleware),
  devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
