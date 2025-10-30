import { useSearchParams } from "react-router-dom";
import { WinScreen } from "./WinScreen.js";

type TestMode = "win-screen-single" | "win-screen-multiple";

export const Test = () => {
  const [searchParams] = useSearchParams();
  const testMode = searchParams.get("test") as TestMode | null;

  if (testMode === "win-screen-single") {
    return <WinScreen starfishImgName="P6300331.JPG" winningSnapDataUrl="" />;
  } else if (testMode === "win-screen-multiple") {
    return <WinScreen starfishImgName="P6300370.JPG" winningSnapDataUrl="" />;
  } else {
    return <div>Invalid test mode</div>;
  }
};
