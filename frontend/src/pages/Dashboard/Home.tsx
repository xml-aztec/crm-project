import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import OrderStatusSummary from "../../components/ecommerce/OrderStatusSummary";
import { useRoleAccess } from "../../hooks/useRoleAccess";

export default function Home() {
  const { isAdmin } = useRoleAccess();

  return (
    <>
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics />

          {isAdmin && <MonthlySalesChart />}
        </div>

        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>

        {isAdmin && (
          <div className="col-span-12">
            <StatisticsChart />
          </div>
        )}

        {isAdmin && (
          <>
            {/* ✅ Уменьшаем ширину RecentOrders */}
            <div className="col-span-12 xl:col-span-6">
              <RecentOrders />
            </div>

            {/* ✅ Подгоняем ширину OrderStatusSummary */}
            <div className="col-span-12 xl:col-span-6">
              <OrderStatusSummary />
            </div>
          </>
        )}
      </div>
    </>
  );
}
