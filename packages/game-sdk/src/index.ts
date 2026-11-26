/**
 * SYNTHPLAY Lightweight Game SDK (< 3KB)
 * Drop into any HTML5 / WebGL / AI single-file game to enable cloud saves,
 * global/country leaderboards, rewarded video ad callbacks, and creator tip popups.
 */

export type SdkMessageType =
  | "INIT"
  | "SAVE_CLOUD"
  | "LOAD_CLOUD"
  | "SUBMIT_SCORE"
  | "REQUEST_REWARDED_AD"
  | "OPEN_CREATOR_TIP";

export interface SdkEnvelope {
  source: "synthplay-sdk";
  type: SdkMessageType;
  gameId: string;
  payload?: Record<string, unknown>;
}

export function createSynthPlayClient(gameId: string) {
  function post(type: SdkMessageType, payload?: Record<string, unknown>) {
    if (typeof window === "undefined") return;
    const msg: SdkEnvelope = { source: "synthplay-sdk", type, gameId, payload };
    window.parent.postMessage(msg, "*");
  }

  return {
    init: () => post("INIT"),
    saveCloud: (slot: string, data: Record<string, unknown>) =>
      post("SAVE_CLOUD", { slot, data }),
    loadCloud: (slot: string) => post("LOAD_CLOUD", { slot }),
    submitScore: (score: number, metadata?: Record<string, unknown>) =>
      post("SUBMIT_SCORE", { score, metadata }),
    requestRewardedAd: (placement: string) =>
      post("REQUEST_REWARDED_AD", { placement }),
    openCreatorTip: () => post("OPEN_CREATOR_TIP")
  };
}
