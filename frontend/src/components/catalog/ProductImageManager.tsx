import { useCallback, useMemo, useState } from 'react';
import { asApiError, getApiErrorMessage } from '../../types/apiError';
import { useDropzone } from 'react-dropzone';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  ProductImage,
  usePresignProductImageMutation,
  useConfirmProductImageMutation,
  useReorderProductImagesMutation,
  useSetProductImagePrimaryMutation,
  useDeleteProductImageMutation,
} from '../../store/api/catalogApi';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;
const DND_ITEM_TYPE = 'product-image';

interface ProductImageManagerProps {
  productId: number;
  images: ProductImage[];
}

interface UploadStatus {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'error';
  error?: string;
}

interface ImageTileProps {
  image: ProductImage;
  index: number;
  onMove: (fromIndex: number, toIndex: number) => void;
  onDropCommit: () => void;
  onOpenLightbox: () => void;
  onSetPrimary: () => void;
  onDelete: () => void;
}

function ImageTile({ image, index, onMove, onDropCommit, onOpenLightbox, onSetPrimary, onDelete }: ImageTileProps) {
  const [{ isDragging }, dragRef] = useDrag({
    type: DND_ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: onDropCommit,
  });

  const [, dropRef] = useDrop({
    accept: DND_ITEM_TYPE,
    hover: (item: { index: number }) => {
      if (item.index === index) return;
      onMove(item.index, index);
      item.index = index;
    },
  });

  return (
    <div
      ref={(node) => {
        dragRef(node);
        dropRef(node);
      }}
      className={`relative group border rounded-lg overflow-hidden cursor-move ${
        isDragging ? 'opacity-40' : ''
      } border-gray-200 dark:border-gray-700`}
    >
      <img
        src={image.thumbnail_url}
        alt=""
        loading="lazy"
        onClick={onOpenLightbox}
        className="w-full h-32 object-cover cursor-pointer"
      />
      {image.is_primary && (
        <span className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-[10px] font-semibold px-1.5 py-0.5 rounded">
          ★ Главное
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
        {!image.is_primary && (
          <button
            type="button"
            onClick={onSetPrimary}
            className="text-[11px] text-white px-1.5 py-0.5 rounded hover:bg-white/20"
            title="Сделать главным"
          >
            ★
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="text-[11px] text-white px-1.5 py-0.5 rounded hover:bg-red-500/70 ml-auto"
          title="Удалить"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function Lightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: ProductImage[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const image = images[index];
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-2xl"
      >
        ✕
      </button>
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((index - 1 + images.length) % images.length);
          }}
          className="absolute left-4 text-white text-3xl px-2"
        >
          ‹
        </button>
      )}
      <img
        src={image.full_url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] max-w-[85vw] object-contain"
      />
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigate((index + 1) % images.length);
          }}
          className="absolute right-4 text-white text-3xl px-2"
        >
          ›
        </button>
      )}
    </div>
  );
}

export default function ProductImageManager({ productId, images }: ProductImageManagerProps) {
  const [orderedImages, setOrderedImages] = useState<ProductImage[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [uploads, setUploads] = useState<UploadStatus[]>([]);

  const [presignImage] = usePresignProductImageMutation();
  const [confirmImage] = useConfirmProductImageMutation();
  const [reorderImages] = useReorderProductImagesMutation();
  const [setPrimary] = useSetProductImagePrimaryMutation();
  const [deleteImage] = useDeleteProductImageMutation();

  const displayImages = orderedImages ?? images;

  const handleFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const uploadId = `${file.name}-${Date.now()}-${Math.random()}`;

        if (!ALLOWED_TYPES.includes(file.type)) {
          setUploads((prev) => [
            ...prev,
            { id: uploadId, filename: file.name, status: 'error', error: 'Допустимые форматы: JPG, PNG, WebP' },
          ]);
          continue;
        }
        if (file.size > MAX_SIZE) {
          setUploads((prev) => [
            ...prev,
            { id: uploadId, filename: file.name, status: 'error', error: 'Максимальный размер файла — 5 МБ' },
          ]);
          continue;
        }

        setUploads((prev) => [...prev, { id: uploadId, filename: file.name, status: 'uploading' }]);

        try {
          const { upload_url, key } = await presignImage({
            productId,
            filename: file.name,
            content_type: file.type,
            file_size: file.size,
          }).unwrap();

          const putResp = await fetch(upload_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });
          if (!putResp.ok) {
            throw new Error('Не удалось загрузить файл в хранилище');
          }

          setUploads((prev) =>
            prev.map((u) => (u.id === uploadId ? { ...u, status: 'processing' } : u))
          );

          await confirmImage({ productId, key }).unwrap();

          setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        } catch (rawErr) {
          const err = asApiError(rawErr);
          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId
                ? { ...u, status: 'error', error: getApiErrorMessage(err, 'Ошибка загрузки') }
                : u
            )
          );
        }
      }
    },
    [productId, presignImage, confirmImage]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    multiple: true,
    onDrop: handleFiles,
  });

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      const base = orderedImages ?? images;
      const next = [...base];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setOrderedImages(next);
    },
    [orderedImages, images]
  );

  const handleDropCommit = useCallback(async () => {
    if (!orderedImages) return;
    try {
      await reorderImages({ productId, image_ids: orderedImages.map((img) => img.id) }).unwrap();
    } finally {
      setOrderedImages(null);
    }
  }, [orderedImages, productId, reorderImages]);

  const lightboxImages = useMemo(() => displayImages, [displayImages]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Изображения товара</h2>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-brand-500 bg-gray-50 dark:bg-gray-900'
            : 'border-gray-300 dark:border-gray-700 hover:border-brand-400'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isDragActive ? 'Отпустите файлы для загрузки' : 'Перетащите изображения сюда или нажмите, чтобы выбрать'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, WebP — до 5 МБ</p>
      </div>

      {uploads.length > 0 && (
        <div className="mt-4 space-y-1">
          {uploads.map((u) => (
            <div key={u.id} className="text-xs flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400 truncate">{u.filename}</span>
              {u.status === 'error' ? (
                <span className="text-red-600 dark:text-red-400">{u.error}</span>
              ) : (
                <span className="text-blue-600 dark:text-blue-400">
                  {u.status === 'uploading' ? 'Загрузка...' : 'Обработка...'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {displayImages.length > 0 && (
        <DndProvider backend={HTML5Backend}>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {displayImages.map((image, index) => (
              <ImageTile
                key={image.id}
                image={image}
                index={index}
                onMove={handleMove}
                onDropCommit={handleDropCommit}
                onOpenLightbox={() => setLightboxIndex(index)}
                onSetPrimary={() => setPrimary({ productId, imageId: image.id })}
                onDelete={() => deleteImage({ productId, imageId: image.id })}
              />
            ))}
          </div>
        </DndProvider>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
