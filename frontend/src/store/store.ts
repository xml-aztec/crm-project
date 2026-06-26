import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';
import {
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

// Middleware
import { authErrorMiddleware } from './middleware/authErrorMiddleware';

// Slices
import authSlice from './slices/authSlice';

// APIs
import { authApi } from './api/authApi';
import { userApi } from './api/userApi';
import { usersManagementApi } from './api/usersManagementApi';
import { rolesPositionsApi } from './api/rolesPositionsApi';
import { positionsApi } from './api/positionsApi'; 
import { catalogApi } from './api/catalogApi';
import { ordersApi } from './api/ordersApi';
import { customersApi } from './api/customersApi';
import { customerTypesApi } from './api/customerTypesApi';
import { paymentMethodsApi } from './api/paymentMethodsApi';
import { branchesApi } from './api/branchesApi';
import { warehousesApi } from './api/warehousesApi';
import { warehouseApi } from './api/warehouseApi';
import { stockApi } from './api/stockApi';
import { stockLogsApi } from './api/stockLogsApi';
import { suppliesApi } from './api/suppliesApi';
import { suppliersApi } from './api/suppliersApi';
import { cashflowApi } from './api/cashflowApi';
import { budgetApi } from './api/budgetApi';
import { cashGapApi } from './api/cashGapApi';
import { monthlyTargetsApi } from './api/monthlyTargetsApi';
import { kpiRulesApi } from './api/kpiRulesApi';
import { payrollApi } from './api/payrollApi';
import { usersApi } from './api/usersApi'; 
import { userStatsApi } from './api/userStatsApi';
import { analyticsApi } from './api/analyticsApi';
import { notificationsApi } from './api/notificationsApi';
import { rbacApi } from './api/rbacApi';

const persistConfig = {
  key: 'leadflow',
  version: 1,
  storage,
  whitelist: ['auth'], 
  blacklist: [], 
};

const rootReducer = combineReducers({
  auth: authSlice,
  [authApi.reducerPath]: authApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [usersManagementApi.reducerPath]: usersManagementApi.reducer,
  [rolesPositionsApi.reducerPath]: rolesPositionsApi.reducer,
  [positionsApi.reducerPath]: positionsApi.reducer, 
  [catalogApi.reducerPath]: catalogApi.reducer,
  [ordersApi.reducerPath]: ordersApi.reducer,
  [customersApi.reducerPath]: customersApi.reducer,
  [customerTypesApi.reducerPath]: customerTypesApi.reducer,
  [paymentMethodsApi.reducerPath]: paymentMethodsApi.reducer,
  [branchesApi.reducerPath]: branchesApi.reducer,
  [warehousesApi.reducerPath]: warehousesApi.reducer,
  [warehouseApi.reducerPath]: warehouseApi.reducer,
  [stockApi.reducerPath]: stockApi.reducer,
  [stockLogsApi.reducerPath]: stockLogsApi.reducer,
  [suppliesApi.reducerPath]: suppliesApi.reducer,
  [suppliersApi.reducerPath]: suppliersApi.reducer,
  [cashflowApi.reducerPath]: cashflowApi.reducer,
  [budgetApi.reducerPath]: budgetApi.reducer,
  [cashGapApi.reducerPath]: cashGapApi.reducer,
  [usersApi.reducerPath]: usersApi.reducer,
  [monthlyTargetsApi.reducerPath]: monthlyTargetsApi.reducer,
  [kpiRulesApi.reducerPath]: kpiRulesApi.reducer,
  [payrollApi.reducerPath]: payrollApi.reducer,
  [userStatsApi.reducerPath]: userStatsApi.reducer,
  [analyticsApi.reducerPath]: analyticsApi.reducer,
  [notificationsApi.reducerPath]: notificationsApi.reducer,
  [rbacApi.reducerPath]: rbacApi.reducer,
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
          'catalogApi/executeQuery/fulfilled',
          'catalogApi/executeQuery/pending',
          'catalogApi/executeQuery/rejected',
          'catalogApi/executeMutation/fulfilled', 
          'catalogApi/executeMutation/pending',
          'catalogApi/executeMutation/rejected',
          'catalogApi/subscriptions/unsubscribeQueryResult',
          'suppliesApi/executeQuery/fulfilled', 
          'suppliesApi/executeQuery/pending',
          'suppliesApi/executeQuery/rejected',
        ],
        ignoredPaths: [
          // CatalogApi - queries и mutations
          'catalogApi.queries',
          'catalogApi.mutations',
          'catalogApi.subscriptions',
          // SuppliesApi - для PDF файлов
          'suppliesApi.queries',
          'suppliesApi.mutations',
          // Конкретные пути для Blob данных
          /catalogApi\.queries\.getProductQRCode/,
          /catalogApi\.queries\.downloadProductQRCode/,
          /catalogApi\.mutations\..*\.data/,
          /suppliesApi\.queries\.getSupplyPDF/,
        ],
        ignoredActionPaths: [
          'payload',
          'meta.arg',
          'meta.baseQueryMeta',
          'meta.request',
          'meta.response',
        ],
        isSerializable: (value: any) => {
          // Игнорируем Blob объекты
          if (value instanceof Blob) {
            return false;
          }
          // Игнорируем File объекты (если будут использоваться)
          if (value instanceof File) {
            return false;
          }
          // Для всех остальных значений используем стандартную проверку
          return true;
        },
      },
      immutableCheck: import.meta.env.DEV,
    }).concat(
      authErrorMiddleware,
      authApi.middleware,
      userApi.middleware,
      usersManagementApi.middleware,
      rolesPositionsApi.middleware,
      positionsApi.middleware, 
      catalogApi.middleware,
      ordersApi.middleware,
      customersApi.middleware,
      customerTypesApi.middleware,
      paymentMethodsApi.middleware,
      branchesApi.middleware,
      warehousesApi.middleware,
      warehouseApi.middleware,
      stockApi.middleware,
      stockLogsApi.middleware,
      suppliesApi.middleware,
      suppliersApi.middleware,
      cashflowApi.middleware,
      budgetApi.middleware,
      usersApi.middleware,
      cashGapApi.middleware,
      monthlyTargetsApi.middleware,
      kpiRulesApi.middleware,
      payrollApi.middleware,
      userStatsApi.middleware,
      analyticsApi.middleware,
      notificationsApi.middleware,
      rbacApi.middleware,
    ),
  devTools: import.meta.env.DEV,
});

export const persistor = persistStore(store);

// Экспортируем типы для middleware
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;