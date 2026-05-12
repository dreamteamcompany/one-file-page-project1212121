import Icon from '@/components/ui/icon';

interface TicketFormStepperProps {
  step: number;
  stepLabels: string[];
  classifying: boolean;
}

const TicketFormStepper = ({ step, stepLabels, classifying }: TicketFormStepperProps) => {
  return (
    <>
      <div className="mt-2 mb-1">
        <div className="flex items-center gap-0">
          {stepLabels.map((label, index) => {
            const stepNum = index + 1;
            const isCompleted = step > stepNum;
            const isCurrent = step === stepNum;
            return (
              <div key={stepNum} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? <Icon name="Check" size={14} /> : stepNum}
                  </div>
                  <span className={`text-[10px] whitespace-nowrap ${isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                </div>
                {index < stepLabels.length - 1 && (
                  <div className={`flex-1 h-[2px] mb-4 mx-1 rounded transition-all ${step > stepNum ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {classifying && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="animate-spin">
            <Icon name="Loader2" size={32} className="text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">ИИ анализирует описание...</p>
        </div>
      )}
    </>
  );
};

export default TicketFormStepper;
