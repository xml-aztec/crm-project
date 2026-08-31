import { useEffect, useState } from 'react';
import Button from '../../components/ui/button/Button';
import Label from '../../components/form/Label';
import Input from '../../components/form/input/InputField';
import { useGetAppSettingsQuery, useUpdateAppSettingsMutation } from '../../store/api/appSettingsApi';
import { useGetWarehousesQuery } from '../../store/api/warehouseApi';
import { useGetBranchesQuery } from '../../store/api/branchesApi';

interface FormState {
  company_name: string;
  company_logo_url: string;
  company_address: string;
  company_phone: string;
  default_warehouse_id: string;
  default_branch_id: string;
}

const EMPTY_FORM: FormState = {
  company_name: '',
  company_logo_url: '',
  company_address: '',
  company_phone: '',
  default_warehouse_id: '',
  default_branch_id: '',
};

const General: React.FC = () => {
  const { data: settings, isLoading } = useGetAppSettingsQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();
  const { data: branches = [] } = useGetBranchesQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateAppSettingsMutation();

  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        company_logo_url: settings.company_logo_url || '',
        company_address: settings.company_address || '',
        company_phone: settings.company_phone || '',
        default_warehouse_id: settings.default_warehouse_id?.toString() || '',
        default_branch_id: settings.default_branch_id?.toString() || '',
      });
    }
  }, [settings]);

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
    if (field === 'company_logo_url') setLogoError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({
        company_name: formData.company_name.trim() || null,
        company_logo_url: formData.company_logo_url.trim() || null,
        company_address: formData.company_address.trim() || null,
        company_phone: formData.company_phone.trim() || null,
        default_warehouse_id: formData.default_warehouse_id ? Number(formData.default_warehouse_id) : null,
        default_branch_id: formData.default_branch_id ? Number(formData.default_branch_id) : null,
      }).unwrap();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 4000);
    } catch {
      setSaveStatus('error');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Общие настройки</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Реквизиты компании и значения по умолчанию для новых заказов
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Реквизиты компании</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Отображаются в PDF-накладных поставок
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label>Название компании</Label>
              <Input
                type="text"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="Название компании"
              />
            </div>

            <div className="md:col-span-2">
              <Label>Ссылка на логотип</Label>
              <Input
                type="text"
                value={formData.company_logo_url}
                onChange={(e) => handleChange('company_logo_url', e.target.value)}
                placeholder="https://..."
              />
              {formData.company_logo_url && !logoError && (
                <img
                  src={formData.company_logo_url}
                  alt="Логотип"
                  onError={() => setLogoError(true)}
                  className="mt-2 h-12 object-contain"
                />
              )}
              {logoError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">Не удалось загрузить изображение по этой ссылке</p>
              )}
            </div>

            <div>
              <Label>Адрес</Label>
              <Input
                type="text"
                value={formData.company_address}
                onChange={(e) => handleChange('company_address', e.target.value)}
                placeholder="Город, улица, дом"
              />
            </div>

            <div>
              <Label>Телефон</Label>
              <Input
                type="text"
                value={formData.company_phone}
                onChange={(e) => handleChange('company_phone', e.target.value)}
                placeholder="+996 ..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Значения по умолчанию</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Склад подставляется автоматически при создании нового заказа
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Склад по умолчанию</Label>
              <select
                value={formData.default_warehouse_id}
                onChange={(e) => handleChange('default_warehouse_id', e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                <option value="">Не выбран</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <Label>Филиал по умолчанию</Label>
              <select
                value={formData.default_branch_id}
                onChange={(e) => handleChange('default_branch_id', e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
              >
                <option value="">Не выбран</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-600 dark:text-green-400">Настройки сохранены</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-600 dark:text-red-400">Не удалось сохранить настройки</span>
          )}
        </div>
      </form>
    </div>
  );
};

export default General;
