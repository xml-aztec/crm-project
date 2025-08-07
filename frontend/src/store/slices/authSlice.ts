import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../api/axios';
import { UserRead, ApiError } from '../../types/auth';

interface AuthState {
  user: UserRead | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | ApiError | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  initialized: false,
};

// Логин пользователя
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authService.login(email, password);
      return response;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Ошибка входа в систему';
      return rejectWithValue(errorMessage);
    }
  }
);

// Получение данных текущего пользователя
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (state.auth.initialized && state.auth.user) {
        return state.auth.user;
      }

      const user = await authService.getCurrentUser();
      return user;
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Ошибка при получении данных пользователя';
      return rejectWithValue({ 
        message: errorMessage, 
        status: error.response?.status 
      });
    }
  }
);

// Выход из системы с вызовом серверной ручки
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      // Вызываем серверную ручку для завершения сессии
      await authService.logout();
    } catch (error: any) {
      // Логируем ошибку сервера, но продолжаем локальную очистку
      if (import.meta.env.DEV) {
        console.warn('Ошибка при выходе на сервере:', error);
      }
      // Не блокируем logout из-за серверных ошибок
    }
    
    // Очищаем локальные данные
    try {
      localStorage.removeItem('redirectAfterLogin');
      localStorage.removeItem('rememberMe');
    } catch (error) {
      // Игнорируем ошибки localStorage (например, в приватном режиме)
    }
    
    // Всегда выполняем локальную очистку состояния
    dispatch(logout());
    
    return true;
  }
);

// Создаем slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.initialized = true;
    },
    clearError(state) {
      state.error = null;
    },
    setAuthenticated(state, action: PayloadAction<boolean>) {
      state.isAuthenticated = action.payload;
      if (!action.payload) {
        state.user = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
        state.initialized = true;
      })
      
      // Fetch current user cases
      .addCase(fetchCurrentUser.pending, (state) => {
        if (!state.initialized) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
        state.initialized = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as ApiError;
        state.initialized = true;
      })
      
      // Logout cases
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        // Состояние уже очищено в reducers.logout
        state.loading = false;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Даже при ошибке logout завершаем очистку состояния
        state.loading = false;
        // Состояние уже очищено в reducers.logout
      });
  },
});

export const { logout, clearError, setAuthenticated } = authSlice.actions;
export default authSlice.reducer;