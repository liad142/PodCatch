import { FileText, Sparkles } from 'lucide-react';

export default function SummariesPage() {
  return (
    <div className="px-4 py-8">
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Episode Summaries
        </h1>
        
        <p className="text-xl text-muted-foreground mb-6">
          Coming soon
        </p>
        
        <p className="text-muted-foreground max-w-md mx-auto">
          Browse and search all your AI-generated episode summaries in one place. 
          Quickly find key insights and takeaways from any episode you have listened to.
        </p>
        
        <div className="mt-8 p-4 rounded-lg bg-muted/30 border border-dashed">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Powered by AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
