import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import { fetchCurrentUser } from './store/slices/authSlice';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import SignIn from "./pages/AuthPages/SignIn";

import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";

import RequireAuth from "./components/auth/RequireAuth";
import RequirePermission from "./components/auth/RequirePermission";

import { useAppDispatch, useAppSelector } from './hooks/reduxHooks';

// Ленивая загрузка страниц: раньше в приложении не было ни одного
// динамического импорта, и весь код (включая FullCalendar, ApexCharts,
// jVectorMap, Swiper и сканер штрихкодов) приезжал одним бандлом на 2,6 МБ
// ещё до показа формы входа. Теперь каждый маршрут — отдельный чанк.
const SignUp = lazy(() => import('./pages/AuthPages/SignUp'));
const ForgotPassword = lazy(() => import('./pages/AuthPages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/AuthPages/ResetPassword'));
const NotFound = lazy(() => import('./pages/OtherPage/NotFound'));
const UserProfiles = lazy(() => import('./pages/UserProfiles'));
const Users = lazy(() => import('./pages/users/Users'));
const RegistrationRequests = lazy(() => import('./pages/users/RegistrationRequests'));
const BasicTables = lazy(() => import('./pages/Tables/BasicTables'));
const FormElements = lazy(() => import('./pages/Forms/FormElements'));
const Home = lazy(() => import('./pages/Dashboard/Home'));
const Calendar = lazy(() => import('./pages/Calendar'));
const AllOrders = lazy(() => import('./pages/orders/AllOrders'));
const CreateOrderPage = lazy(() => import('./pages/CreateOrderPage'));
const OrderDetailsPage = lazy(() => import('./pages/orders/OrderDetailsPage'));
const ReturnsManagement = lazy(() => import('./pages/returns/ReturnsManagement'));
const Products = lazy(() => import('./pages/catalog/Products'));
const CreateProduct = lazy(() => import('./pages/catalog/CreateProduct'));
const Categories = lazy(() => import('./pages/catalog/Categories'));
const Customers = lazy(() => import('./pages/customers/Customers'));
const CustomerTypes = lazy(() => import('./pages/customers/CustomerTypes'));
const General = lazy(() => import('./pages/config/General'));
const PaymentMethods = lazy(() => import('./pages/config/PaymentMethods'));
const Positions = lazy(() => import('./pages/config/Positions'));
const Notifications = lazy(() => import('./pages/config/Notifications'));
const Branches = lazy(() => import('./pages/branches/Branches'));
const Warehouses = lazy(() => import('./pages/warehouse/Warehouses'));
const WarehouseInventory = lazy(() => import('./pages/warehouse/WarehouseInventory'));
const StockManagement = lazy(() => import('./pages/stock/StockManagement'));
const StockLogsPage = lazy(() => import('./pages/stock/StockLogsPage'));
const SuppliesManagement = lazy(() => import('./pages/supplies/SuppliesManagement'));
const CreateSupply = lazy(() => import('./pages/supplies/CreateSupply'));
const SupplyDetails = lazy(() => import('./pages/supplies/SupplyDetails'));
const EditSupply = lazy(() => import('./pages/supplies/EditSupply'));
const Suppliers = lazy(() => import('./pages/suppliers/Suppliers'));
const Finance = lazy(() => import('./pages/finance/Finance'));
const PayrollManagement = lazy(() => import('./pages/payroll/PayrollManagement'));
const CashflowMetaManagement = lazy(() => import('./pages/finance/CashflowMetaManagement'));
const MonthlyTargetsManagement = lazy(() => import('./pages/finance/MonthlyTargetsManagement'));
const PnLReport = lazy(() => import('./pages/finance/PnLReport'));
const EditProduct = lazy(() => import('./pages/catalog/EditProduct'));
const SettingsHub = lazy(() => import('./pages/settings/SettingsHub'));
const RolesPermissions = lazy(() => import('./pages/settings/RolesPermissions'));

const AppWithRedux = () => {
  const dispatch = useAppDispatch();
  const { initialized } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (!initialized) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, initialized]);

  return (
    <Router>
      <ScrollToTop />
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-brand-500" />
          </div>
        }
      >
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Защищенные маршруты с Layout */}
        <Route element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }>
          <Route index path="/" element={<Home />} />
          <Route path="/calendar" element={<Calendar />} />

          {/* User Management Pages */}
          <Route path="/users" element={<Users />} />
          <Route path="/registration-requests" element={<RegistrationRequests />} />
          
          {/* Customer Management Pages */}
          <Route path="/customers" element={<RequirePermission permission="customers.read"><Customers /></RequirePermission>} />
          <Route path="/customer-types" element={<RequirePermission permission="customers.read"><CustomerTypes /></RequirePermission>} />

          {/* Orders Management Pages */}
          <Route path="/orders" element={<RequirePermission permission="orders.read"><AllOrders /></RequirePermission>} />
          <Route path="/orders/create" element={<RequirePermission permission="orders.read"><CreateOrderPage /></RequirePermission>} />
          <Route path="/orders/:id" element={<RequirePermission permission="orders.read"><OrderDetailsPage /></RequirePermission>} />
          <Route path="/returns" element={<RequirePermission permission="orders.read"><ReturnsManagement /></RequirePermission>} />

          {/* Warehouse Management Pages */}
          <Route path="/warehouses" element={<RequirePermission permission="stock.read"><Warehouses /></RequirePermission>} />
          <Route path="/warehouses/:warehouseId/inventory" element={<RequirePermission permission="stock.read"><WarehouseInventory /></RequirePermission>} />
          <Route path="/stock" element={<RequirePermission permission="stock.read"><StockManagement /></RequirePermission>} />
          <Route path="/stock/logs" element={<RequirePermission permission="stock.read"><StockLogsPage /></RequirePermission>} />

          {/* Supplies Management Pages */}
          <Route path="/supplies" element={<RequirePermission permission="supplies.read"><SuppliesManagement /></RequirePermission>} />
          <Route path="/supplies/create" element={<RequirePermission permission="supplies.read"><CreateSupply /></RequirePermission>} />
          <Route path="/supplies/:id" element={<RequirePermission permission="supplies.read"><SupplyDetails /></RequirePermission>} />
          <Route path="/supplies/:id/edit" element={<RequirePermission permission="supplies.read"><EditSupply /></RequirePermission>} />

          {/* Suppliers Management Pages */}
          <Route path="/suppliers" element={<RequirePermission permission="supplies.read"><Suppliers /></RequirePermission>} />

          {/* Finance Pages */}
          <Route path="/finance" element={<RequirePermission permission="cashflow.read"><Finance /></RequirePermission>} />
          <Route path="/finance/cashflow-meta" element={<RequirePermission permission="cashflow.read"><CashflowMetaManagement /></RequirePermission>} />
          <Route path="/finance/monthly-targets" element={<RequirePermission permission="cashflow.read"><MonthlyTargetsManagement /></RequirePermission>} />
          <Route path="/finance/pnl" element={<RequirePermission permission="cashflow.read"><PnLReport /></RequirePermission>} />
          
          {/* Payroll Management Pages */}
          <Route path="/payroll" element={<PayrollManagement />} />
          
          {/* Branches Management Pages */}
          <Route path="/branches" element={<Branches />} />
          
          {/* Settings Hub */}
          <Route path="/settings" element={<SettingsHub />} />
          <Route path="/settings/roles" element={<RolesPermissions />} />

          {/* Configuration Pages */}
          <Route path="/config/general" element={<General />} />
          <Route path="/config/payment-methods" element={<PaymentMethods />} />
          <Route path="/config/positions" element={<Positions />} />
          <Route path="/config/notifications" element={<Notifications />} />
          
          {/* Forms Pages */}
          <Route path="/form-elements" element={<FormElements />} />
          
          {/* Tables Pages */}
          <Route path="/basic-tables" element={<BasicTables />} />
          
          {/* Catalog Pages */}
          <Route path="/products" element={<RequirePermission permission="products.read"><Products /></RequirePermission>} />
          <Route path="/products/create" element={<RequirePermission permission="products.read"><CreateProduct /></RequirePermission>} />

          {/* ✅ ОБНОВЛЯЕМ: Переносим маршрут в правильную секцию */}
          <Route path="/catalog/products" element={<RequirePermission permission="products.read"><Products /></RequirePermission>} />
          <Route path="/catalog/products/create" element={<RequirePermission permission="products.read"><CreateProduct /></RequirePermission>} />
          <Route path="/catalog/products/:id/edit" element={<RequirePermission permission="products.read"><EditProduct /></RequirePermission>} />
          <Route path="/categories" element={<RequirePermission permission="products.read"><Categories /></RequirePermission>} />
          
          {/* Others Page */}
          <Route path="/profile" element={<UserProfiles />} />
        </Route>
        
        {/* Fallback Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      
    </Router>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <SidebarProvider>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <AppWithRedux />
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
