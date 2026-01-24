"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Summary, Transcript } from "@/types/database";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Github,
  Book,
  Wrench,
  Link as LinkIcon,
  Check,
  FileText,
  Lightbulb,
  ExternalLink,
} from "lucide-react";

interface SummaryViewProps {
  summary: Summary;
  transcript?: Transcript;
  episodeTitle?: string;
}

export function SummaryView({ summary, transcript, episodeTitle }: SummaryViewProps) {
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const handleCopySummary = async () => {
    const textToCopy = [
      summary.summary_text,
      "",
      summary.key_points?.length
        ? "Key Points:\n" + summary.key_points.map((p) => `- ${p}`).join("\n")
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    await navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleCopyTranscript = async () => {
    if (transcript?.full_text) {
      await navigator.clipboard.writeText(transcript.full_text);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    }
  };

  const handleExport = () => {
    const content = [
      `# ${episodeTitle || "Episode Summary"}`,
      "",
      "## Summary",
      summary.summary_text,
      "",
      summary.key_points?.length
        ? "## Key Points\n" + summary.key_points.map((p) => `- ${p}`).join("\n")
        : "",
      "",
      summary.resources?.github_repos?.length
        ? "## GitHub Repos\n" + summary.resources.github_repos.map((r) => `- ${r}`).join("\n")
        : "",
      summary.resources?.books?.length
        ? "## Books\n" + summary.resources.books.map((b) => `- ${b}`).join("\n")
        : "",
      summary.resources?.tools?.length
        ? "## Tools\n" + summary.resources.tools.map((t) => `- ${t}`).join("\n")
        : "",
      summary.resources?.links?.length
        ? "## Links\n" + summary.resources.links.map((l) => `- ${l}`).join("\n")
        : "",
      "",
      transcript?.full_text
        ? "## Full Transcript\n" + transcript.full_text
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(episodeTitle || "summary").replace(/[^a-z0-9]/gi, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasResources =
    summary.resources &&
    (summary.resources.github_repos?.length ||
      summary.resources.books?.length ||
      summary.resources.tools?.length ||
      summary.resources.links?.length);

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>Summary</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopySummary}>
              {copiedSummary ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copiedSummary ? "Copied!" : "Copy"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed whitespace-pre-wrap">
            {summary.summary_text}
          </p>
        </CardContent>
      </Card>

      {/* Key Points Section */}
      {summary.key_points && summary.key_points.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <CardTitle>Key Points</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {summary.key_points.map((point, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Badge
                    variant="secondary"
                    className="mt-0.5 shrink-0 h-6 w-6 rounded-full p-0 flex items-center justify-center"
                  >
                    {index + 1}
                  </Badge>
                  <span className="text-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Resources Section */}
      {hasResources && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-primary" />
              <CardTitle>Resources</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {summary.resources?.github_repos && summary.resources.github_repos.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 font-semibold mb-3">
                  <Github className="h-4 w-4" />
                  GitHub Repos
                </h4>
                <ul className="space-y-2">
                  {summary.resources.github_repos.map((repo, index) => (
                    <li key={index}>
                      <a
                        href={repo.startsWith("http") ? repo : `https://github.com/${repo}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {repo}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.resources?.books && summary.resources.books.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 font-semibold mb-3">
                  <Book className="h-4 w-4" />
                  Books
                </h4>
                <ul className="space-y-2">
                  {summary.resources.books.map((book, index) => (
                    <li key={index} className="text-foreground">
                      {book}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.resources?.tools && summary.resources.tools.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 font-semibold mb-3">
                  <Wrench className="h-4 w-4" />
                  Tools
                </h4>
                <ul className="space-y-2">
                  {summary.resources.tools.map((tool, index) => (
                    <li key={index} className="text-foreground">
                      {tool}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.resources?.links && summary.resources.links.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 font-semibold mb-3">
                  <LinkIcon className="h-4 w-4" />
                  Links
                </h4>
                <ul className="space-y-2">
                  {summary.resources.links.map((link, index) => (
                    <li key={index}>
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        {link}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Transcript Section */}
      {transcript && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Full Transcript</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {isTranscriptOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyTranscript();
                    }}
                  >
                    {copiedTranscript ? (
                      <Check className="mr-2 h-4 w-4" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {copiedTranscript ? "Copied!" : "Copy"}
                  </Button>
                )}
                <Button variant="ghost" size="sm">
                  {isTranscriptOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          {isTranscriptOpen && (
            <CardContent>
              <div className="max-h-96 overflow-y-auto rounded-md bg-muted p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap font-mono">
                  {transcript.full_text}
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
