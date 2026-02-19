// src/pages/InstructionPage.tsx
import { useRef, useState } from 'react';
import turtleTopView from '../assets/turtle-top-view.gif';
import turtleLeftSide from '../assets/turtle-left-side.jpg';
import turtleRightSide from '../assets/turtle-right-side.jpg';

interface InstructionPageProps {
  onBack: () => void;
  onIdentify: () => void;
  siteName: string;
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
        borderTop: '1px solid #1e3a24',
        paddingTop: '1.5rem',
      }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            color: '#f0ede6',
            fontSize: large ? '1.25rem' : '1rem',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        {required && (
          <span
            className="text-xs uppercase"
            style={{
              fontFamily: "'DM Mono', monospace",
              color: '#6b8f71',
              letterSpacing: '0.2em',
            }}
          >
            Required
          </span>
        )}
      </div>

      {/* Placeholder / Preview image area */}
      <div
        style={{
          width: '100%',
          aspectRatio: large ? '4/3' : '16/9',
          border: '1px dashed #3a5c40',
          backgroundColor: '#0f2414',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
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
                backgroundColor: '#6b8f71',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="#0a1a0e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
          fontFamily: "'DM Mono', monospace",
          color: '#a8c5ae',
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
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.2em',
          color: hovered ? '#0a1a0e' : '#6b8f71',
          borderColor: '#6b8f71',
          backgroundColor: hovered ? '#6b8f71' : 'transparent',
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

export function InstructionPage({ onBack, onIdentify, siteName }: InstructionPageProps) {
  const [topImage, setTopImage] = useState<File | null>(null);
  const [leftImage, setLeftImage] = useState<File | null>(null);
  const [rightImage, setRightImage] = useState<File | null>(null);
  const [identifyHovered, setIdentifyHovered] = useState(false);

  const identifyEnabled = topImage !== null;

  return (
    <div
      className="flex flex-col w-full px-8 py-10 gap-8"
      style={{ backgroundColor: '#0a1a0e', minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onBack}
          style={{ color: '#6b8f71', background: 'none', border: 'none', cursor: 'pointer', padding: 0, alignSelf: 'flex-start' }}
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4L7 10l6 6" stroke="#6b8f71" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {siteName && (
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              color: '#a8c5ae',
              fontSize: '0.6rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}
          >
            {siteName}
          </p>
        )}
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            color: '#f0ede6',
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          How to Photograph Your Turtle
        </h1>
      </div>

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

      {/* Identify button */}
      <button
        type="button"
        disabled={!identifyEnabled}
        className="w-full py-4 text-xs uppercase border transition-all duration-300 mt-4 mb-8"
        style={{
          fontFamily: "'DM Mono', monospace",
          letterSpacing: '0.25em',
          cursor: identifyEnabled ? 'pointer' : 'not-allowed',
          color: identifyEnabled
            ? identifyHovered ? '#0a1a0e' : '#6b8f71'
            : '#2a4030',
          borderColor: identifyEnabled ? '#6b8f71' : '#2a4030',
          backgroundColor: identifyEnabled && identifyHovered ? '#6b8f71' : 'transparent',
        }}
        onMouseEnter={() => identifyEnabled && setIdentifyHovered(true)}
        onMouseLeave={() => setIdentifyHovered(false)}
        onClick={() => {
          if (!identifyEnabled) return;
          onIdentify();
        }}
      >
        Identify My Turtle
      </button>
    </div>
  );
}
