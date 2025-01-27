import { Details } from "express-useragent";

export function getDeviceId(useragent: Details) {
  const browser = useragent?.browser;
  const os = useragent?.os;
  const type = (() => {
    if (!useragent) {
      return "none";
    }
    if (useragent.isBot) {
      return "bot";
    }
    if (useragent.isTablet) {
      return "tablet";
    }
    if (useragent.isDesktop) {
      return "desktop";
    }
    if (useragent.isMobile) {
      return "mobile";
    }
    if (useragent.isSmartTV) {
      return "smart-tv";
    }
    return "other";
  })();

  const name = JSON.stringify({
    browser,
    os,
  });

  return {
    browser,
    os,
    name,
    type,
    other: useragent,
  } as const;
}
