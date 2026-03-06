// src/pages/InstructionPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import turtleTopView from '../assets/turtle-top-view.jpg';
import turtleLeftSide from '../assets/turtle-left-side.jpg';
import turtleRightSide from '../assets/turtle-right-side.jpg';
import type { Site } from '../App';
import { SiteBand } from '../components/SiteBand';
import { Footer } from '../components/Footer';

export interface SubmittedPhotos {
  top: File;
  left: File | null;
  right: File | null;
  other: File[];
}

interface InstructionPageProps {
  onBack: () => void;
  onIdentify: (photos: SubmittedPhotos) => void;
  siteName: string;
  site: Site;
  onAbout: () => void;
}

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState(false);
  const previewUrl = image ? URL.createObjectURL(image) : null;

  return (
    <div
      className="w-full flex flex-col gap-3"
      style={{
        borderTop: '1px solid var(--color-border)',
        paddingTop: '1.5rem',
      }}
    >
      {/* Label row */}
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

      {/* Placeholder / Preview image area */}
      <div
        onClick={() => inputRef.current?.click()}
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
            {/* Checkmark overlay */}
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

      {/* Tip */}
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

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageSelect(file);
        }}
      />

      {/* Submit button */}
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
        onClick={() => inputRef.current?.click()}
      >
        {image ? 'Replace Image' : 'Submit Image'}
      </button>
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [hovered, setHovered] = useState(false);
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
    // Reset input so same files can be re-selected if needed
    e.target.value = '';
  };

  const handleRemove = (id: number) => {
    const updated = images.filter((item) => item.id !== id);
    onImagesChange(updated);
  };

  return (
    <div
      className="w-full flex flex-col gap-3"
      style={{
        borderTop: '1px solid var(--color-border)',
        paddingTop: '1.5rem',
      }}
    >
      {/* Label row */}
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

      {/* Tip */}
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

      {/* Thumbnail grid or empty placeholder */}
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
                ✕
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

      {/* Hidden file input (multiple) */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFilesSelected}
      />

      {/* Add Photos button */}
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
        onClick={() => inputRef.current?.click()}
      >
        + Add Photos
      </button>
    </div>
  );
}

export function InstructionPage({ onBack, onIdentify, siteName: _siteName, site, onAbout }: InstructionPageProps) {
  const [topImage, setTopImage] = useState<File | null>(null);
  const [leftImage, setLeftImage] = useState<File | null>(null);
  const [rightImage, setRightImage] = useState<File | null>(null);
  const [otherImages, setOtherImages] = useState<TrackedFile[]>([]);
  const [identifyHovered, setIdentifyHovered] = useState(false);

  const identifyEnabled = topImage !== null;

  return (
    <div
      className="flex flex-col w-full px-8 pb-10 pt-20 gap-8"
      style={{ backgroundColor: 'var(--color-bg)', minHeight: '100dvh' }}
    >
      <SiteBand site={site} />
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
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

      {/* Introductory text */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          color: 'var(--color-text-muted)',
          fontSize: '0.875rem',
          letterSpacing: '0.05em',
        }}
      >
        Submit photos of your turtle to help us identify it. The top view is required — side views improve accuracy. Tap any photo area or button to get started.
      </p>

      {/* Cards */}
      <PhotoCard
        label="Top View"
        tip="Position yourself directly above the turtle"
        illustration={turtleTopView}
        required
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

      {/* Other Photos */}
      <OtherPhotosCard
        images={otherImages}
        onImagesChange={setOtherImages}
      />

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
        onClick={() => {
          if (!identifyEnabled || !topImage) return;
          onIdentify({ top: topImage, left: leftImage, right: rightImage, other: otherImages.map((item) => item.file) });
        }}
      >
        Identify My Turtle
      </button>
      <Footer onAbout={onAbout} />
    </div>
  );
}
