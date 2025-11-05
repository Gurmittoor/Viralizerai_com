import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CreditCostBadgeProps {
  cost: number;
  feature: string;
}

export function CreditCostBadge({ cost, feature }: CreditCostBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="gap-1 text-xs">
            <Zap className="w-3 h-3 text-accent" />
            {cost} {cost === 1 ? "credit" : "credits"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {feature} costs {cost} credit{cost !== 1 ? "s" : ""}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
