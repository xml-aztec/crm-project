/**
 * Регистрация всех наборов эндпоинтов в общем baseApi.
 *
 * injectEndpoints выполняется в момент импорта модуля. Компоненты и так
 * импортируют нужные им хуки, но store не должен зависеть от того, какой
 * экран отрендерился первым: authSlice, например, дёргает
 * authApi.endpoints.login.initiate напрямую. Этот файл гарантирует, что к
 * моменту создания store зарегистрированы все 31 наборов.
 *
 * Импорты только ради побочного эффекта — экспортов здесь нет.
 */
import './analyticsApi';
import './appSettingsApi';
import './authApi';
import './branchesApi';
import './budgetApi';
import './cashGapApi';
import './cashflowApi';
import './catalogApi';
import './customerTypesApi';
import './customersApi';
import './kpiRulesApi';
import './monthlyTargetsApi';
import './notificationsApi';
import './ordersApi';
import './paymentMethodsApi';
import './payrollApi';
import './positionsApi';
import './rbacApi';
import './returnsApi';
import './rolesPositionsApi';
import './searchApi';
import './stockApi';
import './stockLogsApi';
import './suppliersApi';
import './suppliesApi';
import './tasksApi';
import './userApi';
import './userStatsApi';
import './usersApi';
import './usersManagementApi';
import './warehouseApi';
