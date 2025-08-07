interface DebugObjectRendererProps {
  data: unknown;
  name: string;
}

export const DebugObjectRenderer = ({ data, name }: DebugObjectRendererProps) => {
  // Убираем логирование в продакшене
  if (import.meta.env.DEV) {
    console.log(`${name}:`, data, typeof data);
    
    if (data && typeof data === 'object') {
      console.log(`${name} keys:`, Object.keys(data));
    }
  }

  // Безопасный рендер
  if (data === null || data === undefined) {
    return <span>null/undefined</span>;
  }

  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return <span>{String(data)}</span>;
  }

  if (typeof data === 'object') {
    return <span>[Object: {Object.keys(data).join(', ')}]</span>;
  }

  return <span>[Unknown type: {typeof data}]</span>;
};