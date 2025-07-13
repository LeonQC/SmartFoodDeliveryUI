import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

/**
 * CVA-based Badge component
 * Usage:
 * <Badge variant="success">Active</Badge>
 * <Badge variant="destructive">Inactive</Badge>
 */
const badgeVariants = cva(
  "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-800",
        destructive: "bg-red-100 text-red-800",
        outline: "border border-gray-300 text-gray-800",
        success: "bg-green-100 text-green-800",
        primary: "bg-blue-100 text-blue-800",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant, className, ...props }, ref) => (
    <span
      ref={ref}
      className={badgeVariants({ variant, className })}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
