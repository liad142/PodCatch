import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";

import { HeroScene } from "./scenes/HeroScene";
import { AISummariesScene } from "./scenes/AISummariesScene";
import { PodcastDiscoveryScene } from "./scenes/PodcastDiscoveryScene";
import { YouTubeScene } from "./scenes/YouTubeScene";
import { InsightsScene } from "./scenes/InsightsScene";
import { CTAScene } from "./scenes/CTAScene";

// Scene durations in frames (at 30fps)
const HERO_DURATION = 120; // 4s
const FEATURE_DURATION = 105; // 3.5s
const CTA_DURATION = 120; // 4s
const TRANSITION_DURATION = 15; // 0.5s

// Total: 120 + 105*4 + 120 - 5*15 = 600 - 75 = ...
// We'll set total composition to 600 frames (20s)

export const MarketingVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f111a" }}>
      <TransitionSeries>
        {/* Scene 1: Hero Intro */}
        <TransitionSeries.Sequence durationInFrames={HERO_DURATION}>
          <HeroScene />
        </TransitionSeries.Sequence>

        {/* Transition: Fade to AI Summaries */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 2: AI Summaries */}
        <TransitionSeries.Sequence durationInFrames={FEATURE_DURATION}>
          <AISummariesScene />
        </TransitionSeries.Sequence>

        {/* Transition: Slide to Discovery */}
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 3: Podcast Discovery */}
        <TransitionSeries.Sequence durationInFrames={FEATURE_DURATION}>
          <PodcastDiscoveryScene />
        </TransitionSeries.Sequence>

        {/* Transition: Wipe to YouTube */}
        <TransitionSeries.Transition
          presentation={wipe()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 4: YouTube Integration */}
        <TransitionSeries.Sequence durationInFrames={FEATURE_DURATION}>
          <YouTubeScene />
        </TransitionSeries.Sequence>

        {/* Transition: Slide to Insights */}
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 5: Insights Hub */}
        <TransitionSeries.Sequence durationInFrames={FEATURE_DURATION}>
          <InsightsScene />
        </TransitionSeries.Sequence>

        {/* Transition: Fade to CTA */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 6: CTA / Closing */}
        <TransitionSeries.Sequence durationInFrames={CTA_DURATION}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
