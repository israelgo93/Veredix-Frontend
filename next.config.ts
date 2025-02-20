import withPWA from "next-pwa";
import runtimeCaching from "next-pwa/cache";

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching,
})({
  reactStrictMode: true,
});
