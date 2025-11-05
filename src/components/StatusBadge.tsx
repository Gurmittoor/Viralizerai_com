import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, XCircle, Loader2 } from "lucide-react";

type StatusType = 'queued' | 'script_ready' | 'rendered' | 'merged' | 'captioned' | 'ready_for_post' | 'posted' | 'error' | 'manual_review';
type ComplianceType = 'unchecked' | 'compliant' | 'auto_adjusted' | 'flagged' | 'manual_review';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = {
    queued: { icon: Clock, variant: 'secondary' as const, label: 'Queued' },
    script_ready: { icon: Loader2, variant: 'secondary' as const, label: 'Script Ready' },
    rendered: { icon: Loader2, variant: 'secondary' as const, label: 'Rendered' },
    merged: { icon: Loader2, variant: 'secondary' as const, label: 'Merged' },
    captioned: { icon: Loader2, variant: 'secondary' as const, label: 'Captioned' },
    ready_for_post: { icon: CheckCircle2, variant: 'default' as const, label: 'Ready to Post' },
    posted: { icon: CheckCircle2, variant: 'default' as const, label: 'Posted' },
    error: { icon: XCircle, variant: 'destructive' as const, label: 'Error' },
    manual_review: { icon: AlertCircle, variant: 'outline' as const, label: 'Manual Review' },
  };

  const { icon: Icon, variant, label } = config[status] || config.queued;

  return (
    <Badge variant={variant} className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

interface ComplianceBadgeProps {
  status: ComplianceType;
  className?: string;
}

export function ComplianceBadge({ status, className }: ComplianceBadgeProps) {
  const config = {
    unchecked: { icon: Clock, color: 'bg-muted text-muted-foreground', label: 'Unchecked' },
    compliant: { icon: CheckCircle2, color: 'bg-success text-success-foreground', label: 'Compliant' },
    auto_adjusted: { icon: AlertCircle, color: 'bg-warning text-warning-foreground', label: 'Auto-Adjusted' },
    flagged: { icon: XCircle, color: 'bg-destructive text-destructive-foreground', label: 'Flagged' },
    manual_review: { icon: AlertCircle, color: 'bg-destructive text-destructive-foreground', label: 'Manual Review' },
  };

  const { icon: Icon, color, label } = config[status] || config.unchecked;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${color} ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  );
}
