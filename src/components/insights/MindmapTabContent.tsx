"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MindmapNode } from "@/types/database";
import { Brain, ChevronDown, ChevronRight, Sparkles, Loader2, Circle, Copy, Check } from "lucide-react";

interface MindmapTabContentProps {
  mindmap: MindmapNode | undefined;
  isLoading: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
}

export function MindmapTabContent({
  mindmap,
  isLoading,
  isGenerating,
  onGenerate
}: MindmapTabContentProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [copied, setCopied] = useState(false);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = (node: MindmapNode) => {
    const ids = new Set<string>();
    const collectIds = (n: MindmapNode) => {
      ids.add(n.id);
      n.children?.forEach(collectIds);
    };
    collectIds(node);
    setExpandedNodes(ids);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['root']));
  };

  const countNodes = (node: MindmapNode): number => {
    let count = 1;
    if (node.children) {
      node.children.forEach(child => {
        count += countNodes(child);
      });
    }
    return count;
  };

  const copyAsText = async () => {
    if (!mindmap) return;

    const toText = (node: MindmapNode, indent = 0): string => {
      const prefix = '  '.repeat(indent) + (indent === 0 ? '' : '- ');
      let text = prefix + node.label + '\n';
      if (node.children) {
        node.children.forEach(child => {
          text += toText(child, indent + 1);
        });
      }
      return text;
    };

    await navigator.clipboard.writeText(toText(mindmap));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-12 w-64 mx-auto" />
        <div className="pl-8 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!mindmap) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center p-4">
        <Brain className="h-12 w-12 text-muted-foreground mb-4" />
        {isGenerating ? (
          <>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Creating mindmap...</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">No mindmap generated yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Generate insights to create a visual mindmap
            </p>
            <Button onClick={onGenerate} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Insights
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Topic Mindmap
          <Badge variant="outline">{countNodes(mindmap)} nodes</Badge>
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => expandAll(mindmap)}>
            Expand All
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Collapse
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copyAsText}
            className="gap-1"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mindmap Tree */}
      <div className="flex-1 overflow-auto p-4">
        <MindmapNodeComponent
          node={mindmap}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
          level={0}
        />
      </div>

      {/* Hint */}
      <div className="p-3 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Click on nodes to expand/collapse branches
        </p>
      </div>
    </div>
  );
}

interface MindmapNodeComponentProps {
  node: MindmapNode;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  level: number;
}

function MindmapNodeComponent({
  node,
  expandedNodes,
  onToggle,
  level
}: MindmapNodeComponentProps) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  const getNodeStyle = (level: number) => {
    switch (level) {
      case 0: // Root
        return 'bg-primary text-primary-foreground font-bold text-base px-4 py-3';
      case 1: // Main branches
        return 'bg-secondary font-semibold text-sm px-3 py-2';
      case 2: // Sub branches
        return 'bg-muted text-sm px-3 py-2';
      default: // Leaves
        return 'bg-background border text-sm px-2 py-1.5';
    }
  };

  const getConnectorColor = (level: number) => {
    switch (level) {
      case 0: return 'border-primary';
      case 1: return 'border-secondary';
      default: return 'border-muted-foreground/30';
    }
  };

  return (
    <div className="relative">
      {/* Node */}
      <div className="flex items-center">
        {/* Connector line for non-root nodes */}
        {level > 0 && (
          <div className={cn(
            "w-6 h-px border-t-2 mr-2",
            getConnectorColor(level - 1)
          )} />
        )}

        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className="flex items-center gap-1"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className={cn(
              "rounded-lg transition-all hover:shadow-md cursor-pointer",
              getNodeStyle(level)
            )}>
              {node.label}
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <Circle className="h-2 w-2 shrink-0 text-muted-foreground fill-current" />
            <span className={cn(
              "rounded-lg",
              getNodeStyle(level)
            )}>
              {node.label}
            </span>
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className={cn(
          "ml-4 mt-2 pl-4 space-y-2",
          level < 3 && `border-l-2 ${getConnectorColor(level)}`
        )}>
          {node.children!.map((child, i) => (
            <MindmapNodeComponent
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
