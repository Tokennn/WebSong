import { TextRevealByWord } from '@/components/ui/text-reveal';
import { cn } from '@/lib/utils';

export function TextRevealDemo() {
  return (
    <div className="relative min-h-[200vh] w-full bg-black">
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="mx-auto w-full max-w-5xl p-4">
          <div
            className={cn(
              'flex h-[500px] w-full items-center justify-center rounded-lg',
              'border border-neutral-800',
              'bg-black/55 backdrop-blur-sm',
              'pointer-events-auto'
            )}
          >
            <TextRevealByWord text="Discover here by genre or musical theme" />
          </div>
        </div>
      </div>

      <div className="h-[200vh]" aria-hidden="true" />
    </div>
  );
}
