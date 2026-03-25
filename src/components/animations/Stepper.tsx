"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

export interface Step {
  id: string | number;
  label: string;
  description?: string;
  content: React.ReactNode;
}

interface StepperProps {
  steps: Step[];
  onComplete?: () => void;
  className?: string;
  completeText?: string;
}

export default function Stepper({ steps, onComplete, className, completeText = "Concluir" }: StepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = right, -1 = left

  const goToNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection(1);
      setCurrentStep(curr => curr + 1);
    } else if (onComplete) {
      onComplete();
    }
  };

  const goToPrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(curr => curr - 1);
    }
  };

  const current = steps[currentStep];

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
      filter: "blur(4px)",
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 40 : -40,
      opacity: 0,
      filter: "blur(4px)",
    }),
  };

  return (
    <div className={cn("w-full flex flex-col", className)}>
      {/* Step Indicators */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-crimson -translate-y-1/2 z-0 transition-all duration-500 ease-out" 
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
        
        {steps.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          
          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2 group">
              <button
                onClick={() => {
                  if (idx < currentStep) {
                    setDirection(-1);
                    setCurrentStep(idx);
                  }
                }}
                disabled={idx > currentStep}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bebas text-sm transition-all duration-300",
                  isActive ? "bg-crimson text-white shadow-[0_0_15px_rgba(196,18,48,0.5)] ring-4 ring-crimson/20" :
                  isCompleted ? "bg-[#c41230] text-white cursor-pointer hover:ring-2 ring-crimson/30" :
                  "bg-[#1A1A20] border border-white/10 text-bone/40"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : (idx + 1)}
              </button>
              <div className="absolute top-10 flex flex-col items-center w-24">
                <span className={cn(
                  "text-[10px] uppercase tracking-widest font-semibold transition-colors text-center",
                  isActive || isCompleted ? "text-bone/90" : "text-bone/30"
                )}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="relative min-h-[300px] mt-12 bg-white/3 border border-white/5 rounded-2xl p-6 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full h-full"
          >
            {current.description && (
              <div className="mb-6 pb-4 border-b border-white/5">
                <h3 className="text-lg font-semibold text-bone">{current.label}</h3>
                <p className="text-sm text-bone/50">{current.description}</p>
              </div>
            )}
            
            {current.content}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={goToPrev}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm font-medium text-bone/70 hover:bg-white/5 hover:text-bone transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        
        <button
          onClick={goToNext}
          className="flex items-center gap-2 px-6 py-2 rounded-xl bg-crimson text-white text-sm font-medium hover:bg-crimson/80 transition-all hover:shadow-[0_0_15px_rgba(196,18,48,0.4)]"
        >
          {currentStep === steps.length - 1 ? completeText : (
            <>Próximo <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
