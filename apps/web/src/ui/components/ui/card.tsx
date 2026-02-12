import * as React from "react";
import { cn } from "../../lib/cn";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <section ref={ref} className={cn("surface-card", className)} {...props} />
));
Card.displayName = "Card";

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <header className={cn("flex flex-col gap-1.5 p-5 pb-2", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-base font-semibold tracking-tight", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-4 p-5 pt-3", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <footer className={cn("flex items-center gap-2 p-5 pt-0", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
