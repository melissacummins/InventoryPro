import { useState } from 'react';
import { BookOpenCheck, ImagePlus, Lightbulb, FileText, Film, ChevronRight, Check } from 'lucide-react';
import BookAnalysisStep from './BookAnalysisStep';
import CreativeStudioStep from './CreativeStudioStep';
import HookWorkshopStep from './HookWorkshopStep';
import CopyGeneratorStep from './CopyGeneratorStep';
import ScriptBuilderStep from './ScriptBuilderStep';

const STEPS = [
  { id: 'book-analysis', label: 'Book Analysis', icon: BookOpenCheck, description: 'Themes, tropes, personas' },
  { id: 'creative-studio', label: 'Creative Studio', icon: ImagePlus, description: 'Imagery & video' },
  { id: 'hook-workshop', label: 'Hook Workshop', icon: Lightbulb, description: 'Select or craft hooks' },
  { id: 'copy-generator', label: 'Copy Generator', icon: FileText, description: 'Primary text, headlines, descriptions' },
  { id: 'script-builder', label: 'Script Builder', icon: Film, description: 'Reel scripts & text overlay' },
] as const;

type StepId = typeof STEPS[number]['id'];

export default function AdsTab() {
  const [activeStep, setActiveStep] = useState<StepId>('book-analysis');
  const [completedSteps, setCompletedSteps] = useState<Set<StepId>>(new Set());

  const activeIndex = STEPS.findIndex(s => s.id === activeStep);

  function markComplete(stepId: StepId) {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  }

  function goToNext() {
    const nextIndex = activeIndex + 1;
    if (nextIndex < STEPS.length) {
      markComplete(activeStep);
      setActiveStep(STEPS[nextIndex].id);
    }
  }

  return (
    <div>
      {/* Workflow Steps */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === activeStep;
          const isCompleted = completedSteps.has(step.id);

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setActiveStep(step.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-w-fit ${
                  isActive
                    ? 'bg-pink-50 border-2 border-pink-300 text-pink-700 shadow-sm'
                    : isCompleted
                    ? 'bg-green-50 border-2 border-green-200 text-green-700'
                    : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                  isActive
                    ? 'bg-pink-100'
                    : isCompleted
                    ? 'bg-green-100'
                    : 'bg-slate-100'
                }`}>
                  {isCompleted ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">{step.label}</div>
                  <div className="text-xs opacity-70">{step.description}</div>
                </div>
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 mx-1 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        {activeStep === 'book-analysis' && (
          <BookAnalysisStep onComplete={goToNext} />
        )}
        {activeStep === 'creative-studio' && (
          <CreativeStudioStep onComplete={goToNext} />
        )}
        {activeStep === 'hook-workshop' && (
          <HookWorkshopStep onComplete={goToNext} />
        )}
        {activeStep === 'copy-generator' && (
          <CopyGeneratorStep onComplete={goToNext} />
        )}
        {activeStep === 'script-builder' && (
          <ScriptBuilderStep />
        )}
      </div>
    </div>
  );
}
