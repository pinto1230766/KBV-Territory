import React, { useRef, useState, useEffect } from 'react';
import { X, Save, Trash2, PenTool, Eraser } from 'lucide-react';
import type { Territory } from '../types';

interface AnnotationCanvasModalProps {
  territory: Territory;
  onSaveAnnotation: (territoryId: string, dataUrl: string | null) => void;
  onClose: () => void;
}

export const AnnotationCanvasModal: React.FC<AnnotationCanvasModalProps> = ({
  territory,
  onSaveAnnotation,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#ef4444'); // Rouge par défaut
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajuster la résolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Dessiner le fond (grille / carte simulée)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Si une annotation existe déjà, la recharger
    if (territory.annotationDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = territory.annotationDataUrl;
    } else {
      // Repère cartographique pour repère visuel
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, rect.width - 80, rect.height - 80);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Carte de travail : Territoire ${territory.number}`, 50, 70);
    }
  }, [territory]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = lineWidth * 3;
    } else if (tool === 'highlighter') {
      ctx.strokeStyle = `${currentColor}55`; // Transparence surligneur
      ctx.lineWidth = lineWidth * 4;
    } else {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = lineWidth;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSaveAnnotation(territory.id, dataUrl);
    onClose();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, rect.width, rect.height);
    onSaveAnnotation(territory.id, null);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3200,
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '850px', background: '#101522', padding: '1.25rem', position: 'relative', display: 'flex', flexDirection: 'column', height: '85vh' }}>
        {/* Entête */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Annoter le Territoire {territory.number}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Dessinez au doigt ou au stylet les zones, flèches et consignes de prédication</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Barre d'outils de dessin */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', background: 'var(--bg-tertiary)', padding: '0.5rem 1rem', borderRadius: '10px' }}>
          {/* Sélection Outil */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setTool('pen')}
              className={`btn ${tool === 'pen' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            >
              <PenTool size={14} /> Crayon
            </button>
            <button
              onClick={() => setTool('highlighter')}
              className={`btn ${tool === 'highlighter' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            >
              Surligneur
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`btn ${tool === 'eraser' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            >
              <Eraser size={14} /> Gomme
            </button>
          </div>

          {/* Palette Couleurs */}
          {tool !== 'eraser' && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {['#ef4444', '#f59e0b', '#38bdf8', '#10b981', '#ec4899', '#ffffff'].map(c => (
                <button
                  key={c}
                  onClick={() => setCurrentColor(c)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: c,
                    border: currentColor === c ? '2px solid white' : '1px solid rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    boxShadow: currentColor === c ? '0 0 6px white' : 'none'
                  }}
                />
              ))}
            </div>
          )}

          {/* Épaisseur */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Taille :</span>
            {[2, 5, 10].map(sz => (
              <button
                key={sz}
                onClick={() => setLineWidth(sz)}
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: lineWidth === sz ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)',
                  color: lineWidth === sz ? 'black' : 'white',
                  border: 'none',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {sz === 2 ? 'Fine' : sz === 5 ? 'Moyenne' : 'Large'}
              </button>
            ))}
          </div>
        </div>

        {/* Canevas de dessin */}
        <div style={{ flex: 1, position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }}
          />
        </div>

        {/* Pied de modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <button onClick={handleClear} className="btn btn-ghost" style={{ color: '#f87171', fontSize: '0.8rem' }}>
            <Trash2 size={14} /> Effacer le dessin
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>Annuler</button>
            <button onClick={handleSave} className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
              <Save size={14} /> Enregistrer l'annotation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
