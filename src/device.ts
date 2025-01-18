import { Details } from "express-useragent";

export function getDeviceId(useragent: Details) {
  const browser = useragent?.browser;
  const os = useragent?.os;

  const name = JSON.stringify({
    browser,
    os,
  });

  return {
    browser,
    os,
    name,
  };
}
