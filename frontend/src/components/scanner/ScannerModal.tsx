import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Modal } from '../ui/modal';
import Button from '../ui/button/Button';
import Label from '../form/Label';
import Input from '../form/input/InputField';
import { useLazyScanProductQuery } from '../../store/api/catalogApi';
import ProductScanResult from './ProductScanResult';

const SCANNER_REGION_ID = 'global-product-scanner-region';

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
];

function playSuccessBeep() {
  try {
    const AudioContextCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
    oscillator.onended = () => ctx.close();
  } catch {
    // Web Audio недоступен в этом браузере — молча пропускаем сигнал
  }
}

/** Чисто цифровые коды длиной 6–14 — это EAN-13/EAN-8/UPC-A/UPC-E/ITF-14;
 * всё остальное (буквенно-цифровой SKU, Code128/39 или числовой ID из
 * QR-кода) предзаполняем как SKU при создании товара. */
function isLikelyBarcode(code: string) {
  return /^\d{6,14}$/.test(code);
}

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ScannerView = 'camera' | 'manual' | 'result';

export default function ScannerModal({ isOpen, onClose }: ScannerModalProps) {
  const navigate = useNavigate();
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const [view, setView] = useState<ScannerView>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [triggerScan, { data: foundProduct, error: scanError, isFetching }] =
    useLazyScanProductQuery();

  const stopCamera = useCallback(async () => {
    const instance = html5QrcodeRef.current;
    if (instance && instance.isScanning) {
      try {
        await instance.stop();
      } catch {
        // камера уже остановлена
      }
    }
    setTorchSupported(false);
    setTorchOn(false);
  }, []);

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      if (processingRef.current) return;
      processingRef.current = true;
      playSuccessBeep();
      setFlash(true);
      window.setTimeout(() => setFlash(false), 400);
      const code = decodedText.trim();
      setScannedCode(code);
      setView('result');
      triggerScan(code);
    },
    [triggerScan]
  );

  const startCamera = useCallback(async () => {
    processingRef.current = false;
    setCameraError(null);
    if (!html5QrcodeRef.current) {
      html5QrcodeRef.current = new Html5Qrcode(SCANNER_REGION_ID, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });
    }
    const config = {
      fps: 10,
      // html5-qrcode кадрирует видео строго по границам qrbox перед
      // декодированием (это не просто визуальная рамка) — прежняя почти
      // квадратная рамка обрезала длинные 1D-штрихкоды (EAN/UPC/Code128 и
      // т.п.), не давая декодеру увидеть код целиком.
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const width = Math.floor(viewfinderWidth * 0.85);
        const height = Math.floor(Math.min(viewfinderHeight * 0.5, width * 0.6));
        return { width, height };
      },
    };

    const tryStart = (cameraIdOrConfig: string | MediaTrackConstraints) =>
      html5QrcodeRef.current!.start(cameraIdOrConfig, config, handleScanSuccess, undefined);

    try {
      await tryStart({ facingMode: 'environment' });
    } catch {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) throw new Error('no-camera');
        await tryStart(cameras[0].id);
      } catch {
        setCameraError(
          'Не удалось получить доступ к камере. Проверьте разрешения браузера или введите код вручную.'
        );
        setView('manual');
        return;
      }
    }

    try {
      const capabilities = html5QrcodeRef.current!.getRunningTrackCameraCapabilities();
      setTorchSupported(capabilities.torchFeature().isSupported());
    } catch {
      setTorchSupported(false);
    }
  }, [handleScanSuccess]);

  // Запускаем/останавливаем камеру строго по текущему view — единственный
  // источник истины, чтобы не гонять start()/stop() из нескольких мест.
  useEffect(() => {
    if (isOpen && view === 'camera') {
      startCamera();
    }
    return () => {
      if (view === 'camera') {
        stopCamera();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, view]);

  // Полный сброс при закрытии окна — освобождаем камеру и чистим DOM,
  // который html5-qrcode создаёт внутри контейнера.
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      try {
        html5QrcodeRef.current?.clear();
      } catch {
        // нечего чистить
      }
      html5QrcodeRef.current = null;
      setView('camera');
      setScannedCode(null);
      setManualCode('');
      setCameraError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Гарантированно останавливаем камеру, если компонент уйдёт из дерева.
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleTorch = async () => {
    try {
      const capabilities = html5QrcodeRef.current?.getRunningTrackCameraCapabilities();
      const torchFeature = capabilities?.torchFeature();
      if (torchFeature?.isSupported()) {
        await torchFeature.apply(!torchOn);
        setTorchOn(!torchOn);
      }
    } catch {
      // фонарик недоступен на этом устройстве
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    setScannedCode(code);
    setView('result');
    triggerScan(code);
  };

  const handleScanNext = () => {
    setScannedCode(null);
    setManualCode('');
    setCameraError(null);
    setView('camera');
  };

  const handleNavigateToEdit = (id: number) => {
    onClose();
    navigate(`/catalog/products/${id}/edit`);
  };

  const handleNavigateToCreate = (code: string) => {
    onClose();
    const field = isLikelyBarcode(code) ? 'barcode' : 'sku';
    navigate(`/catalog/products/create?${field}=${encodeURIComponent(code)}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg w-full m-4">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Сканер товаров
        </h2>

        {view === 'camera' && (
          <div>
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
              <div
                id={SCANNER_REGION_ID}
                className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
              />
              {flash && (
                <div className="absolute inset-0 bg-white/70 pointer-events-none" />
              )}
              {torchSupported && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  aria-label="Фонарик"
                  className={`absolute top-3 right-3 h-10 w-10 rounded-full flex items-center justify-center transition-colors ${
                    torchOn ? 'bg-yellow-400 text-gray-900' : 'bg-black/50 text-white'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </button>
              )}
            </div>
            <p className="mt-3 text-sm text-center text-gray-600 dark:text-gray-400">
              Наведите камеру на QR-код или штрихкод товара
            </p>
            <button
              type="button"
              onClick={() => setView('manual')}
              className="mt-3 w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ввести код вручную
            </button>
          </div>
        )}

        {view === 'manual' && (
          <form onSubmit={handleManualSubmit}>
            {cameraError && (
              <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                {cameraError}
              </div>
            )}
            <Label htmlFor="manual-scan-code">SKU или штрихкод товара</Label>
            <Input
              id="manual-scan-code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Например, 4780123456782"
            />
            <div className="mt-4 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCameraError(null);
                  setView('camera');
                }}
                className="flex-1"
              >
                К камере
              </Button>
              <Button type="submit" className="flex-1" disabled={!manualCode.trim()}>
                Найти
              </Button>
            </div>
          </form>
        )}

        {view === 'result' && scannedCode && (
          <ProductScanResult
            code={scannedCode}
            isLoading={isFetching}
            product={foundProduct}
            error={scanError}
            onScanNext={handleScanNext}
            onNavigateToEdit={handleNavigateToEdit}
            onNavigateToCreate={handleNavigateToCreate}
          />
        )}
      </div>
    </Modal>
  );
}
