import React from 'react';
import { PRD_CONTENT } from '../data';
import { Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export function PRDViewer() {
  return (
    <div className="flex flex-col gap-8 pb-12 w-full max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-zinc-900 mb-3 block">
          {PRD_CONTENT.title}
        </h1>
        <p className="text-zinc-500 font-sans text-sm leading-relaxed">
          根据你的需求整理的 FitSync 训练总结卡产品交互与设计方案。你可以结合左侧的实时交互原型一起查看。
        </p>
      </div>

      <div className="space-y-10">
        {PRD_CONTENT.sections.map((section, idx) => (
          <section key={idx} className="flex flex-col gap-3">
            <h2 className="text-lg font-sans font-semibold text-zinc-800 tracking-tight">
              {section.title}
            </h2>
            <div className="prose prose-zinc prose-sm md:prose-base leading-relaxed text-zinc-600 font-sans">
              <ReactMarkdown>{section.content}</ReactMarkdown>
            </div>
          </section>
        ))}

        {/* 综合视觉诊断建议 */}
        <section className="flex flex-col gap-4 bg-zinc-100/50 rounded-xl p-6 border border-zinc-200/50">
          <h2 className="text-lg font-sans font-semibold text-zinc-800 tracking-tight">
            4. 视觉方向评估与推荐 (Visual Directions)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-2 p-4 bg-zinc-950 text-zinc-300 rounded-lg">
              <span className="font-mono text-xs text-[#00FF66]">DIRECTION A</span>
              <span className="font-display font-bold text-lg text-white">Carbon</span>
              <p className="text-xs opacity-80 leading-relaxed font-sans">
                延续当前黑绿设计。像黑客工具，有一种专注力极高的沉浸感。缺点是容易显得比较硬核、男性化，截图分享到有些社交平台可能有些突兀。
              </p>
            </div>
            
            <div className="flex flex-col gap-2 p-4 bg-white text-black border-4 border-black font-sans">
              <span className="font-mono text-xs opacity-60">DIRECTION B</span>
              <span className="font-display font-bold text-lg uppercase tracking-tighter">Ash</span>
              <p className="text-xs opacity-80 leading-relaxed">
                黑白粗野主义。类似实体打印小票，极高对比度，排版感极强。非常契合“无声、力量、克制”的主题。充满设计感且不落俗套。
              </p>
            </div>

            <div className="flex flex-col gap-2 p-4 bg-[#F2EFE9] text-[#3D3A35] rounded-lg border border-[#E2DED5]">
              <span className="font-mono text-xs opacity-60">DIRECTION C</span>
              <span className="font-serif font-bold text-lg">Canvas</span>
              <p className="text-xs opacity-80 leading-relaxed font-sans">
                原色帆布。ins 极简居家风，柔和安静，像生活记录本。截图分享视觉体验极佳，能中和器械本身冰冷坚硬的感觉。
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 border-l-2 border-zinc-400 bg-white shadow-sm font-sans text-sm text-zinc-700 leading-relaxed">
            <strong>核心结论：</strong> 推荐选择 <strong>Direction B (Ash)</strong>。它保留了黑白风的酷劲儿和力量感，同时通过留白和排版做到了真正的“低调装逼”。它不像绿色荧光那么抢眼，也不像普通白底那么平庸，像一张非常个人化的成就小票。
          </div>
        </section>
      </div>
    </div>
  );
}
