"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Sparkles, ChevronRight, ChevronDown, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { MindmapNode } from "@/types/database";

interface MindmapTeaserProps {
  mindmap: MindmapNode | undefined;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function MindmapTeaser({ mindmap, isGenerating, onGenerate }: MindmapTeaserProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Empty/generating state
  if (!mindmap) {
    return (
      <div className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border bg-muted/30 p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Brain className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Topic Mindmap</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isGenerating
              ? "Generating mindmap..."
              : "Visualize the episode's key topics and connections"}
          </p>
          {!isGenerating && (
            <Button onClick={onGenerate} variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Insights
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  // Count total nodes
  const countNodes = (node: MindmapNode): number => {
    let count = 1;
    if (node.children) {
      node.children.forEach((child) => {
        count += countNodes(child);
      });
    }
    return count;
  };

  return (
    <div className="px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-2xl border overflow-hidden relative"
      >
        {/* Teaser Viewport */}
        <div className="h-[250px] overflow-hidden relative bg-gradient-to-br from-background to-muted/50">
          {/* Animated Mindmap Preview */}
          <div className="absolute inset-0 p-6 animate-mindmap-pan">
            <MindmapPreview node={mindmap} />
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

          {/* CTA Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              onClick={() => setIsModalOpen(true)}
              size="lg"
              className="gap-2 shadow-lg"
            >
              <Brain className="h-5 w-5" />
              Explore Full Mindmap
            </Button>
          </div>

          {/* Node Count Badge */}
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="gap-1">
              <Brain className="h-3 w-3" />
              {countNodes(mindmap)} topics
            </Badge>
          </div>
        </div>

        {/* CSS Animation */}
        <style jsx global>{`
          @keyframes mindmap-pan {
            0%, 100% {
              transform: translate(0, 0);
            }
            50% {
              transform: translate(-30px, -20px);
            }
          }
          .animate-mindmap-pan {
            animation: mindmap-pan 20s ease-in-out infinite;
          }
        `}</style>
      </motion.div>

      {/* Full Mindmap Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Topic Mindmap
              <Badge variant="outline" className="ml-2">
                {countNodes(mindmap)} nodes
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4">
            <MindmapFullView node={mindmap} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simplified mindmap preview for the teaser
function MindmapPreview({ node }: { node: MindmapNode }) {
  return (
    <div className="space-y-3">
      {/* Root node */}
      <div className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold">
        {node.label}
      </div>

      {/* First level children */}
      {node.children && (
        <div className="pl-6 space-y-2 border-l-2 border-primary/30">
          {node.children.slice(0, 4).map((child, i) => (
            <div key={child.id || i} className="flex items-start gap-2">
              <div className="w-4 h-px bg-primary/30 mt-3" />
              <div className="space-y-1">
                <div className="inline-block px-3 py-1.5 rounded-lg bg-secondary font-medium text-sm">
                  {child.label}
                </div>
                {/* Second level (just hints) */}
                {child.children && child.children.length > 0 && (
                  <div className="pl-4 space-y-1">
                    {child.children.slice(0, 2).map((grandchild, j) => (
                      <div
                        key={grandchild.id || j}
                        className="text-xs text-muted-foreground pl-2 border-l border-muted"
                      >
                        {grandchild.label}
                      </div>
                    ))}
                    {child.children.length > 2 && (
                      <div className="text-xs text-muted-foreground pl-2">
                        +{child.children.length - 2} more...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {node.children.length > 4 && (
            <div className="text-sm text-muted-foreground pl-6">
              +{node.children.length - 4} more branches...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Full interactive mindmap view
function MindmapFullView({ node }: { node: MindmapNode }) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["root", node.id])
  );

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const ids = new Set<string>();
    const collectIds = (n: MindmapNode) => {
      ids.add(n.id);
      n.children?.forEach(collectIds);
    };
    collectIds(node);
    setExpandedNodes(ids);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(["root", node.id]));
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-2 pb-2 border-b">
        <Button variant="ghost" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      {/* Tree */}
      <MindmapNodeView
        node={node}
        expandedNodes={expandedNodes}
        onToggle={toggleNode}
        level={0}
      />
    </div>
  );
}

interface MindmapNodeViewProps {
  node: MindmapNode;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  level: number;
}

function MindmapNodeView({ node, expandedNodes, onToggle, level }: MindmapNodeViewProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  const getNodeStyle = (level: number) => {
    switch (level) {
      case 0:
        return "bg-primary text-primary-foreground font-bold px-4 py-2";
      case 1:
        return "bg-secondary font-semibold px-3 py-1.5";
      case 2:
        return "bg-muted px-3 py-1.5";
      default:
        return "bg-background border px-2 py-1";
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center">
        {level > 0 && (
          <div className="w-6 h-px border-t-2 border-muted-foreground/20 mr-2" />
        )}

        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="flex items-center gap-1 group"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span
              className={cn(
                "rounded-lg text-sm transition-all group-hover:shadow-md cursor-pointer",
                getNodeStyle(level)
              )}
            >
              {node.label}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <Circle className="h-2 w-2 shrink-0 text-muted-foreground fill-current" />
            <span className={cn("rounded-lg text-sm", getNodeStyle(level))}>
              {node.label}
            </span>
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-4 mt-2 pl-4 space-y-2 border-l-2 border-muted-foreground/20">
          {node.children!.map((child, i) => (
            <MindmapNodeView
              key={child.id || i}
              node={child}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
