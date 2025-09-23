import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';

interface AccessibleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  titleLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  description?: string;
  children: React.ReactNode;
}

export const AccessibleCard = React.forwardRef<HTMLDivElement, AccessibleCardProps>(
  ({ 
    className, 
    title,
    titleLevel = 'h3',
    description,
    children,
    ...props 
  }, ref) => {
    const TitleComponent = titleLevel;
    
    return (
      <Card
        ref={ref}
        className={cn(className)}
        role="region"
        aria-labelledby={title ? `${titleLevel}-${title.replace(/\s+/g, '-').toLowerCase()}` : undefined}
        {...props}
      >
        {title && (
          <CardHeader>
            <TitleComponent 
              id={`${titleLevel}-${title.replace(/\s+/g, '-').toLowerCase()}`}
              className="text-lg font-semibold"
            >
              {title}
            </TitleComponent>
            {description && (
              <p className="text-sm text-muted-foreground" id={`${titleLevel}-${title.replace(/\s+/g, '-').toLowerCase()}-desc`}>
                {description}
              </p>
            )}
          </CardHeader>
        )}
        <CardContent>
          {children}
        </CardContent>
      </Card>
    );
  }
);

AccessibleCard.displayName = 'AccessibleCard';
