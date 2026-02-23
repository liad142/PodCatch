import { Composition } from "remotion";
import { MarketingVideo } from "./MarketingVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MarketingVideo"
        component={MarketingVideo}
        durationInFrames={585}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
