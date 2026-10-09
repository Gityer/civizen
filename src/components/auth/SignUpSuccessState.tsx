import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

type SignUpSuccessStateProps = {
  backToLoginLabel: string;
  message: string;
  onBackToLogin: () => void;
  title: string;
  /** Extra action under the message, e.g. resend the confirmation e-mail. */
  extra?: ReactNode;
};

export function SignUpSuccessState({
  backToLoginLabel,
  message,
  onBackToLogin,
  title,
  extra,
}: SignUpSuccessStateProps) {
  return (
    <motion.div
      className="mx-auto w-full max-w-sm text-center"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle className="h-10 w-10 text-primary" />
      </div>
      <h1 className="mb-2 font-display text-2xl font-bold text-foreground">{title}</h1>
      <p className="mb-6 text-muted-foreground">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" onClick={onBackToLogin}>
          {backToLoginLabel}
        </Button>
        {extra}
      </div>
    </motion.div>
  );
}
