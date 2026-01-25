import { Brain, Lightbulb } from 'lucide-react';

export default function SmartNotesPage() {
  return (
    <div className="px-4 py-8">
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <Brain className="h-8 w-8 text-primary" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Smart Notes
        </h1>
        
        <p className="text-xl text-muted-foreground mb-6">
          Coming soon
        </p>
        
        <p className="text-muted-foreground max-w-md mx-auto">
          AI-powered notes that connect ideas across episodes. 
          Discover patterns, themes, and connections you might have missed.
        </p>
        
        <div className="mt-8 p-4 rounded-lg bg-muted/30 border border-dashed">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Lightbulb className="h-4 w-4" />
            <span>Intelligent connections</span>
          </div>
        </div>
      </div>
    </div>
  );
}
