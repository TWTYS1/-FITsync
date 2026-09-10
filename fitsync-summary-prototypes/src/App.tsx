import React, { useState, useRef } from 'react';
import { Theme } from './data';
import { CardPrototype } from './components/CardPrototype';
import { PRDViewer } from './components/PRDViewer';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function App() {
  const [activeTheme, setActiveTheme] = useState<Theme>('carbon');
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const themes: { id: Theme; label: string; desc: string }[] = [
    { id: 'carbon', label: 'Carbon', desc: '深邃黑绿 / 硬核沉浸' },
    { id: 'ash', label: 'Ash', desc: '黑白粗野 / 极简收据' },
    { id: 'canvas', label: 'Canvas', desc: '原色帆布 / 生活记录' },
  ];

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High DPI support for sharp images
        useCORS: true,
        backgroundColor: null
      });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `FitSync-Session-042.png`;
      link.click();
    } catch (error) {
      console.error('Failed to generate image', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col xl:flex-row bg-zinc-50">
      
      {/* Left side: Interactive Prototypes */}
      <div className="w-full xl:w-2/5 xl:min-h-screen xl:sticky xl:top-0 bg-zinc-200/50 border-r border-zinc-200 flex flex-col">
        {/* Top bar */}
        <div className="p-6 pb-2">
          <h2 className="font-display font-semibold text-zinc-800 tracking-tight text-lg mb-4">
            视觉原型实验室
          </h2>
          
          {/* Theme Selector */}
          <div className="flex gap-2 p-1 bg-zinc-200/50 rounded-lg max-w-fit">
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTheme(t.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTheme === t.id 
                    ? 'bg-white shadow-sm text-zinc-900 font-semibold' 
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-3 font-mono">
            {themes.find(t => t.id === activeTheme)?.desc}
          </p>
        </div>

        {/* Prototype Viewer */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 gap-8">
          <div ref={cardRef} className="w-full max-w-sm flex">
            <CardPrototype theme={activeTheme} />
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white text-sm font-medium rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isDownloading ? '生成中...' : '保存为图片'}
          </button>
        </div>
      </div>

      {/* Right side: Product Brainstorm & PRD */}
      <div className="w-full xl:w-3/5 p-6 lg:p-16 xl:p-24 bg-white overflow-y-auto">
        <PRDViewer />
      </div>

    </div>
  );
}
