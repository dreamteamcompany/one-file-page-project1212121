import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import Icon from '@/components/ui/icon';

interface LightboxContextValue {
  open: (src: string, alt?: string) => void;
}

const LightboxContext = createContext<LightboxContextValue | null>(null);

export const useImageLightbox = (): LightboxContextValue => {
  const ctx = useContext(LightboxContext);
  if (!ctx) {
    return {
      open: (src) => window.open(src, '_blank'),
    };
  }
  return ctx;
};

interface ImageLightboxProviderProps {
  children: ReactNode;
}

export const ImageLightboxProvider = ({ children }: ImageLightboxProviderProps) => {
  const [src, setSrc] = useState<string | null>(null);
  const [alt, setAlt] = useState<string>('');

  const open = useCallback((nextSrc: string, nextAlt?: string) => {
    setSrc(nextSrc);
    setAlt(nextAlt || '');
  }, []);

  const close = useCallback(() => {
    setSrc(null);
    setAlt('');
  }, []);

  useEffect(() => {
    window.__openImageLightbox = open;
    return () => {
      if (window.__openImageLightbox === open) {
        window.__openImageLightbox = undefined;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [src, close]);

  return (
    <LightboxContext.Provider value={{ open }}>
      {children}
      {src && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр изображения"
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            cursor: 'zoom-out',
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Закрыть"
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 9999,
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <Icon name="X" size={20} />
          </button>
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              cursor: 'default',
            }}
          />
        </div>
      )}
    </LightboxContext.Provider>
  );
};

export default ImageLightboxProvider;