import { useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, ChevronLeft, ChevronRight } from 'lucide-react';

const FlashcardWidget = ({ deckData }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!deckData || !deckData.cards || deckData.cards.length === 0) return null;

  const currentCard = deckData.cards[currentIdx];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIdx((prev) => Math.min(prev + 1, deckData.cards.length - 1));
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIdx((prev) => Math.max(prev - 1, 0));
    }, 150);
  };

  return (
    <div className="bg-white dark:bg-[#2c2d44] border border-dusty-grape/10 dark:border-white/10 rounded-2xl p-5 shadow-lg my-2 w-full flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold font-display text-space-indigo dark:text-parchment flex items-center gap-2">
          <Layers className="w-5 h-5 text-dusty-grape dark:text-lilac-ash" />
          {deckData.title}
        </h3>
        <span className="text-sm font-semibold bg-space-indigo/10 dark:bg-black/30 text-space-indigo dark:text-parchment px-3 py-1 rounded-full">
          {currentIdx + 1} / {deckData.cards.length}
        </span>
      </div>

      {/* 3D Perspective Container */}
      <div
        className="w-full aspect-[5/3] perspective-[1000px] cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          className="w-full h-full relative preserve-3d"
          animate={{ rotateX: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 200, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div 
            className="absolute inset-0 w-full h-full bg-parchment dark:bg-[#1f2032] border-2 border-space-indigo/5 dark:border-white/5 rounded-2xl p-6 shadow-inner flex flex-col items-center justify-center backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="text-sm text-dusty-grape dark:text-lilac-ash/70 font-semibold mb-4 uppercase tracking-widest">Term</p>
            <h4 className="text-2xl font-bold text-space-indigo dark:text-parchment text-center leading-tight">
              {currentCard.front}
            </h4>
            <p className="absolute bottom-4 right-4 text-xs text-dusty-grape/40 dark:text-lilac-ash/30 group-hover:text-dusty-grape/60 transition-colors font-medium">
              Click to flip
            </p>
          </div>

          {/* Back */}
          <div 
            className="absolute inset-0 w-full h-full bg-space-indigo dark:bg-[#3a3f58] border-2 border-transparent rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center backface-hidden overflow-y-auto"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}
          >
            <p className="text-sm text-parchment/60 font-semibold mb-3 uppercase tracking-widest">Definition</p>
            <p className="text-lg font-medium text-parchment text-center leading-relaxed">
              {currentCard.back}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="flex justify-between items-center w-full mt-4">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className="p-2.5 rounded-full bg-space-indigo/5 dark:bg-white/5 text-space-indigo dark:text-parchment hover:bg-space-indigo/10 dark:hover:bg-white/10 disabled:opacity-30 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <p className="text-xs font-medium text-dusty-grape dark:text-lilac-ash/60">
          Click card to flip
        </p>
        <button
          onClick={handleNext}
          disabled={currentIdx === deckData.cards.length - 1}
          className="p-2.5 rounded-full bg-space-indigo/5 dark:bg-white/5 text-space-indigo dark:text-parchment hover:bg-space-indigo/10 dark:hover:bg-white/10 disabled:opacity-30 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default FlashcardWidget;
