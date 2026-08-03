import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, BrainCircuit } from 'lucide-react';

const QuizWidget = ({ quizData }) => {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  if (!quizData || !quizData.questions || quizData.questions.length === 0) return null;

  const currentQuestion = quizData.questions[currentQuestionIdx];

  const handleSelect = (option) => {
    if (showExplanation) return;
    setSelectedOption(option);
    setShowExplanation(true);
    if (option === currentQuestion.correct_answer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIdx < quizData.questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    return (
      <div className="bg-white dark:bg-[#2c2d44] border border-dusty-grape/10 dark:border-white/10 rounded-2xl p-6 shadow-lg my-4 text-center">
        <BrainCircuit className="w-12 h-12 mx-auto text-space-indigo dark:text-parchment mb-4" />
        <h3 className="text-2xl font-bold font-display text-space-indigo dark:text-parchment mb-2">Quiz Completed!</h3>
        <p className="text-lg text-dusty-grape dark:text-lilac-ash font-medium">
          You scored {score} out of {quizData.questions.length}!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#2c2d44] border border-dusty-grape/10 dark:border-white/10 rounded-2xl p-6 shadow-lg my-4 max-w-2xl w-full mx-auto">
      <div className="flex justify-between items-center mb-6 border-b border-dusty-grape/10 dark:border-white/5 pb-4">
        <h3 className="text-xl font-bold font-display text-space-indigo dark:text-parchment flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-dusty-grape dark:text-lilac-ash" />
          {quizData.title}
        </h3>
        <span className="text-sm font-semibold bg-space-indigo/10 dark:bg-black/30 text-space-indigo dark:text-parchment px-3 py-1 rounded-full">
          {currentQuestionIdx + 1} / {quizData.questions.length}
        </span>
      </div>

      <div className="mb-6">
        <h4 className="text-[17px] font-semibold text-space-indigo dark:text-parchment leading-relaxed mb-4">
          {currentQuestion.question}
        </h4>
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrect = option === currentQuestion.correct_answer;
            let btnClass = "bg-white dark:bg-white/5 border border-dusty-grape/20 dark:border-white/10 text-space-indigo dark:text-parchment hover:bg-space-indigo/5 dark:hover:bg-white/10";
            
            if (showExplanation) {
              if (isCorrect) {
                btnClass = "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400";
              } else if (isSelected && !isCorrect) {
                btnClass = "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400";
              } else {
                btnClass = "bg-gray-100 dark:bg-white/5 opacity-50 border-transparent text-gray-500 dark:text-gray-400";
              }
            }

            return (
              <button
                key={idx}
                disabled={showExplanation}
                onClick={() => handleSelect(option)}
                className={`w-full text-left px-5 py-3.5 rounded-xl transition-all font-medium text-[15px] flex items-center justify-between ${btnClass}`}
              >
                <span>{option}</span>
                {showExplanation && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {showExplanation && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-space-indigo/5 dark:bg-black/20 rounded-xl p-4 mb-6 border border-space-indigo/10 dark:border-white/5">
              <p className="text-sm font-medium text-space-indigo dark:text-parchment/90 leading-relaxed">
                <strong className="text-space-indigo dark:text-parchment mr-2">Explanation:</strong>
                {currentQuestion.explanation}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        <button
          disabled={!showExplanation}
          onClick={handleNext}
          className="px-6 py-2.5 bg-space-indigo dark:bg-white/10 text-parchment rounded-xl font-semibold hover:bg-space-indigo/90 dark:hover:bg-white/20 transition-all disabled:opacity-30 disabled:hover:bg-space-indigo dark:disabled:hover:bg-white/10"
        >
          {currentQuestionIdx < quizData.questions.length - 1 ? "Next Question" : "Finish Quiz"}
        </button>
      </div>
    </div>
  );
};

export default QuizWidget;
