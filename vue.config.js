module.exports = {
  // if the app is supposed to run on Github Pages in a subfolder, use the following config:
  // publicPath: process.env.NODE_ENV === "production" ? "/townsquare/" : "/"
  publicPath: process.env.NODE_ENV === "production" ? "/" : "/",
  // Golem fork (FT-1010): the dev server forwards /api to a locally running
  // platform (server/framework.ts, :3939), so the golem modules can speak the
  // SAME same-origin "/api/botc" they speak in production. The old dev-only
  // absolute base (http://localhost:3939) was cross-origin, and the platform
  // sets no CORS headers — every dev-browser read was silently blocked.
  devServer: {
    proxy: {
      "/api": { target: "http://localhost:3939", changeOrigin: true },
    },
  },
};
