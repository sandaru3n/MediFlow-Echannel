"use client";

import { forwardRef } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn("grid gap-1 rounded-lg bg-muted p-1", className)} {...props} />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-[0.95rem]",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-6 outline-none", className)} {...props} />
));
TabsContent.displayName = "TabsContent";
