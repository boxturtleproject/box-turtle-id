// src/public/InstructionPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useSite } from '../shared/context/SiteContext';
import { submitPhotos } from '../shared/lib/api';
import { SiteBand } from '../shared/components/SiteBand';
import { Footer } from '../shared/components/Footer';
import turtleTopView from '../assets/turtle-top-view.jpg';
import turtleLeftSide from '../assets/turtle-left-side.jpg';
import turtleRightSide from '../assets/turtle-right-side.jpg';

interface PhotoCardProps {
  label: string;
  tip: string;
  illustration: string;
  required?: boolean;
  large?: boolean;
  image: File | null;
  onImageSelect: (file: File) => void;
}

function PhotoCard({ label, tip, illustration, required, large, image, onImageSelect }: PhotoCardProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const previewUrl = image ? URL.createObjectURL(image) : null;

  const openChooser = () => setChooserOpen(true);
  const pickCamera = () => { setChooserOpen(false); cameraRef.current?.click(); };
  const pickLibrary = () => { setChooserOpen(false); libraryRef.current?.click(); };

  return (
    <div
      className="w-full flex flex-col gap-3"
      style={{
        borderTop: '1px solid var(--color-border)',
        paddingTop: '1.5rem',
      }}
    >
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: large ? '1.25rem' : '1rem',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span
          className="text-xs uppercase"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            letterSpacing: '0.2em',
          }}
        >
          {required ? 'Required' : 'Optional'}
        </span>
      </div>

      <div
        onClick={openChooser}
        style={{
          width: '100%',
          aspectRatio: '4/3',
          border: '1px dashed var(--color-border-input)',
          backgroundColor: 'var(--color-bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={`${label} preview`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: 'var(--color-btn-primary-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="var(--color-btn-primary-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </>
        ) : (
          <img
            src={illustration}
            alt={`${label} illustration`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      <p
        className="text-sm"
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.1em',
        }}
      >
        {tip}
      </p>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageSelect(file);
          e.target.value = '';
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageSelect(file);
          e.target.value = '';
        }}
      />

      <button
        type="button"
        className="w-full py-4 text-sm uppercase border transition-all duration-300"
        style={{
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.2em',
          color: hovered ? 'var(--color-btn-primary-text)' : 'var(--color-text-secondary)',
          borderColor: 'var(--color-border-action)',
          backgroundColor: hovered ? 'var(--color-btn-primary-bg)' : 'transparent',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={openChooser}
      >
        {image ? 'Replace Image' : 'Submit Image'}
      </button>

      {chooserOpen && (
        <PhotoSourceSheet
          onCamera={pickCamera}
          onLibrary={pickLibrary}
          onCancel={() => setChooserOpen(false)}
        />
      )}
    </div>
  );
}

interface PhotoSourceSheetProps {
  onCamera: () => void;
  onLibrary: () => void;
  onCancel: () => void;
  multiple?: boolean;
}

function PhotoSourceSheet({ onCamera, onLibrary, onCancel }: PhotoSourceSheetProps) {
  const rowStyle: React.CSSProperties = {
    width: '100%',
    padding: '1.125rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    color: 'var(--color-text-primary)',
    fontSize: '1rem',
    textAlign: 'left',
  };

  const iconWrap: React.CSSProperties = {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-secondary)',
    flexShrink: 0,
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 160ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          padding: '0 0.5rem calc(env(safe-area-inset-bottom, 0px) + 0.5rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          animation: 'slideUp 220ms cubic-bezier(0.2, 0.9, 0.3, 1)',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--color-bg)',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0 0' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-border)' }} />
          </div>
          <div
            style={{
              padding: '0.75rem 1rem 0.25rem',
              fontFamily: 'var(--font-body)',
              fontSize: '0.7rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            Add Photo
          </div>
          <button type="button" onClick={onCamera} style={rowStyle}>
            <span style={iconWrap}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
            <span>Take Photo</span>
          </button>
          <div style={{ height: 1, backgroundColor: 'var(--color-border)', marginLeft: '3.375rem' }} />
          <button type="button" onClick={onLibrary} style={rowStyle}>
            <span style={iconWrap}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 14l4-4 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="8" cy="9" r="1.25" fill="currentColor" />
                <path d="M7 20h12a2 2 0 0 0 2-2V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            <span>Choose from Library</span>
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{
            width: '100%',
            padding: '1.125rem 1rem',
            backgroundColor: 'var(--color-bg)',
            border: 'none',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}

interface TrackedFile {
  id: number;
  file: File;
}

interface OtherPhotosCardProps {
  images: TrackedFile[];
  onImagesChange: (images: TrackedFile[]) => void;
}

function OtherPhotosCard({ images, onImagesChange }: OtherPhotosCardProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const idCounterRef = useRef(0);

  const thumbnailUrls = useMemo(
    () => images.map((item) => URL.createObjectURL(item.file)),
    [images]
  );

  useEffect(() => {
    return () => {
      thumbnailUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [thumbnailUrls]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newTracked: TrackedFile[] = Array.from(files).map((file) => ({
      id: idCounterRef.current++,
      file,
    }));
    onImagesChange([...images, ...newTracked]);
    e.target.value = '';
  };

  const handleRemove = (id: number) => {
    onImagesChange(images.filter((item) => item.id !== id));
  };

  return (
    <div
      className="w-full flex flex-col gap-3"
      style={{
        borderTop: '1px solid var(--color-border)',
        paddingTop: '1.5rem',
      }}
    >
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        >
          Other Photos
        </span>
        <span
          className="text-xs uppercase"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-secondary)',
            letterSpacing: '0.2em',
          }}
        >
          Optional
        </span>
      </div>

      <p
        className="text-sm"
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-muted)',
          letterSpacing: '0.1em',
        }}
      >
        Additional photos of the turtle in its environment
      </p>

      {images.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.5rem',
          }}
        >
          {images.map((item, index) => (
            <div
              key={item.id}
              style={{
                position: 'relative',
                aspectRatio: '4/3',
                overflow: 'hidden',
                backgroundColor: 'var(--color-bg-card)',
              }}
            >
              <img
                src={thumbnailUrls[index]}
                alt={`Other photo ${index + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={`Remove photo ${index + 1}`}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-btn-primary-bg)',
                  color: 'var(--color-btn-primary-text)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  fontSize: '0.75rem',
                  lineHeight: 1,
                }}
              >
                x
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '4/3',
            border: '1px dashed var(--color-border-input)',
            backgroundColor: 'var(--color-bg-card)',
          }}
        />
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFilesSelected}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      <button
        type="button"
        className="w-full py-4 text-sm uppercase border transition-all duration-300"
        style={{
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.2em',
          color: hovered ? 'var(--color-btn-primary-text)' : 'var(--color-text-secondary)',
          borderColor: 'var(--color-border-action)',
          backgroundColor: hovered ? 'var(--color-btn-primary-bg)' : 'transparent',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setChooserOpen(true)}
      >
        + Add Photos
      </button>

      {chooserOpen && (
        <PhotoSourceSheet
          multiple
          onCamera={() => { setChooserOpen(false); cameraRef.current?.click(); }}
          onLibrary={() => { setChooserOpen(false); libraryRef.current?.click(); }}
          onCancel={() => setChooserOpen(false)}
        />
      )}
    </div>
  );
}

export function InstructionPage() {
  const navigate = useNavigate();
  const { site } = useSite();
  const [topImage, setTopImage] = useState<File | null>(null);
  const [leftImage, setLeftImage] = useState<File | null>(null);
  const [rightImage, setRightImage] = useState<File | null>(null);
  const [otherImages, setOtherImages] = useState<TrackedFile[]>([]);
  const [identifyHovered, setIdentifyHovered] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!site) throw new Error('Missing site');
      if (!topImage && !leftImage && !rightImage) throw new Error('At least one photo is required');
      return submitPhotos(site, {
        top: topImage,
        left: leftImage,
        right: rightImage,
      });
    },
    onSuccess: (data) => {
      const photos = {
        top: topImage!,
        left: leftImage,
        right: rightImage,
        other: otherImages.map((t) => t.file),
      };
      if (data.candidates.length > 0) {
        navigate('/results', {
          state: {
            submissionId: data.submission_id,
            candidates: data.candidates,
            processingTimeMs: data.processing_time_ms,
            totalCompared: data.total_compared,
            photos,
          },
        });
      } else {
        navigate('/results/no-match', {
          state: {
            submissionId: data.submission_id,
            photos,
          },
        });
      }
    },
  });

  useEffect(() => {
    if (!site) navigate('/');
  }, [site, navigate]);

  if (!site) return null;

  const hasAnyPhoto = topImage !== null || leftImage !== null || rightImage !== null;
  const identifyEnabled = hasAnyPhoto && !mutation.isPending;

  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-20 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      <SiteBand site={site} onWelcome={() => navigate('/')} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10l6 6" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-text-primary)',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          How to Photograph Your Turtle
        </h1>
      </div>

      {/* Intro */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-muted)',
          fontSize: '0.875rem',
          letterSpacing: '0.05em',
        }}
      >
        Submit photos of your turtle to help us identify it. At least one photo is required — more photos improve accuracy. Tap any photo area or button to get started.
      </p>

      {/* Photo cards */}
      <PhotoCard
        label="Top View"
        tip="Position yourself directly above the turtle"
        illustration={turtleTopView}
        large
        image={topImage}
        onImageSelect={setTopImage}
      />
      <PhotoCard
        label="Left Side"
        tip="Optional — helps improve accuracy"
        illustration={turtleLeftSide}
        image={leftImage}
        onImageSelect={setLeftImage}
      />
      <PhotoCard
        label="Right Side"
        tip="Optional — helps improve accuracy"
        illustration={turtleRightSide}
        image={rightImage}
        onImageSelect={setRightImage}
      />

      <OtherPhotosCard
        images={otherImages}
        onImagesChange={setOtherImages}
      />

      {/* Error display */}
      {mutation.isError && (
        <div
          style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-text-error, #ef4444)',
            padding: '1rem',
          }}
        >
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-error, #ef4444)', fontSize: '0.85rem', margin: 0 }}>
            {mutation.error instanceof Error ? mutation.error.message : 'An error occurred. Please try again.'}
          </p>
        </div>
      )}

      {/* Loading state */}
      {mutation.isPending && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            Identifying your turtle...
          </span>
        </div>
      )}

      {/* Identify button */}
      <button
        type="button"
        disabled={!identifyEnabled}
        className="w-full py-4 text-xs uppercase border transition-all duration-300 mt-4"
        style={{
          fontFamily: 'var(--font-body)',
          letterSpacing: '0.25em',
          cursor: identifyEnabled ? 'pointer' : 'not-allowed',
          color: identifyEnabled
            ? identifyHovered ? 'var(--color-btn-primary-text)' : 'var(--color-text-secondary)'
            : 'var(--color-text-disabled)',
          borderColor: identifyEnabled ? 'var(--color-border-action)' : 'var(--color-text-disabled)',
          backgroundColor: identifyEnabled && identifyHovered ? 'var(--color-btn-primary-bg)' : 'transparent',
        }}
        onMouseEnter={() => identifyEnabled && setIdentifyHovered(true)}
        onMouseLeave={() => setIdentifyHovered(false)}
        onClick={() => mutation.mutate()}
      >
        Identify My Turtle
      </button>

      <Footer onAbout={() => navigate('/about')} />
    </div>
  );
}
