import { useRef, useState } from 'react';

export default function UploadZone({ onFileSelected, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/bmp', 'image/webp', 'image/tiff'];
    if (!allowed.includes(file.type)) {
      alert('Unsupported format. Please upload JPEG, PNG, BMP, WebP, or TIFF.');
      return;
    }
    onFileSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div
      className={`upload-zone${dragOver ? ' drag-over' : ''}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <div className="upload-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <p className="upload-title">
        {dragOver ? 'Drop image here' : 'Drag & Drop your image'}
      </p>
      <p className="upload-sub">or click to browse from your computer</p>

      <div className="upload-formats">
        {['JPEG', 'PNG', 'BMP', 'WebP', 'TIFF'].map(f => (
          <span className="format-badge" key={f}>{f}</span>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
        disabled={disabled}
        id="image-file-input"
      />
    </div>
  );
}
