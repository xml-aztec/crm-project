import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router";
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import { fetchCurrentUser } from './store/slices/authSlice';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Users from "./pages/users/Users";
import RegistrationRequests from "./pages/users/RegistrationRequests";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import Calendar from "./pages/Calendar";
import RequireAuth from "./components/auth/RequireAuth";
import AllOrders from './pages/orders/AllOrders';
import CreateOrderPage from './pages/CreateOrderPage';
import OrderDetailsPage from './pages/orders/OrderDetailsPage'; 
import Products from './pages/catalog/Products';
import CreateProduct from './pages/catalog/CreateProduct';
import Categories from './pages/catalog/Categories';
import Customers from './pages/customers/Customers';
import CustomerTypes from './pages/customers/CustomerTypes';
import General from './pages/config/General';
import PaymentMethods from './pages/config/PaymentMethods';
import Positions from './pages/config/Positions';
import Notifications from './pages/config/Notifications';
import Branches from './pages/branches/Branches';
import Warehouses from './pages/warehouse/Warehouses';
import WarehouseInventory from './pages/warehouse/WarehouseInventory';
import StockManagement from './pages/stock/StockManagement';
import StockLogsPage from './pages/stock/StockLogsPage';
import SuppliesManagement from './pages/supplies/SuppliesManagement';
import CreateSupply from './pages/supplies/CreateSupply';
import SupplyDetails from './pages/supplies/SupplyDetails';
import EditSupply from './pages/supplies/EditSupply';
import Suppliers from './pages/suppliers/Suppliers';
import Finance from './pages/finance/Finance';
import PayrollManagement from './pages/payroll/PayrollManagement';
import CashflowMetaManagement from './pages/finance/CashflowMetaManagement';
import MonthlyTargetsManagement from './pages/finance/MonthlyTargetsManagement';
import PnLReport from './pages/finance/PnLReport';
import { useAppDispatch, useAppSelector } from './hooks/reduxHooks';
import EditProduct from "./pages/catalog/EditProduct";
import SettingsHub from './pages/settings/SettingsHub';

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
      <Routes>
        {/* Публичные маршруты */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        
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
          <Route path="/customers" element={<Customers />} />
          <Route path="/customer-types" element={<CustomerTypes />} />
          
          {/* Orders Management Pages */}
          <Route path="/orders" element={<AllOrders />} />
          <Route path="/orders/create" element={<CreateOrderPage />} />
          <Route path="/orders/:id" element={<OrderDetailsPage />} />
          
          {/* Warehouse Management Pages */}
          <Route path="/warehouses" element={<Warehouses />} />
          <Route path="/warehouses/:warehouseId/inventory" element={<WarehouseInventory />} />
          <Route path="/stock" element={<StockManagement />} />
          <Route path="/stock/logs" element={<StockLogsPage />} />
          
          {/* Supplies Management Pages */}
          <Route path="/supplies" element={<SuppliesManagement />} />
          <Route path="/supplies/create" element={<CreateSupply />} />
          <Route path="/supplies/:id" element={<SupplyDetails />} />
          <Route path="/supplies/:id/edit" element={<EditSupply />} />
          
          {/* Suppliers Management Pages */}
          <Route path="/suppliers" element={<Suppliers />} />
          
          {/* Finance Pages */}
          <Route path="/finance" element={<Finance />} />
          <Route path="/finance/cashflow-meta" element={<CashflowMetaManagement />} />
          <Route path="/finance/monthly-targets" element={<MonthlyTargetsManagement />} />
          <Route path="/finance/pnl" element={<PnLReport />} />
          
          {/* Payroll Management Pages */}
          <Route path="/payroll" element={<PayrollManagement />} />
          
          {/* Branches Management Pages */}
          <Route path="/branches" element={<Branches />} />
          
          {/* Settings Hub */}
          <Route path="/settings" element={<SettingsHub />} />

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
          <Route path="/products" element={<Products />} />
          <Route path="/products/create" element={<CreateProduct />} />
          
          {/* ✅ ОБНОВЛЯЕМ: Переносим маршрут в правильную секцию */}
          <Route path="/catalog/products" element={<Products />} />
          <Route path="/catalog/products/create" element={<CreateProduct />} />
          <Route path="/catalog/products/:id/edit" element={<EditProduct />} />
          <Route path="/categories" element={<Categories />} />
          
          {/* Others Page */}
          <Route path="/profile" element={<UserProfiles />} />
        </Route>
        
        {/* Fallback Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
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
