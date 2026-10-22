import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base44 sandbox only: the preview proxy reaches the dev server as
// `<port>-<sandbox id>.<BASE44_SANDBOX_HOST_DOMAIN>`, so that host has to be
// allowlisted (Vite >= 5.4.12 blocks unknown Host headers). Enabled only when
// BASE44_PREVIEW_MODE === "1"; with the variable unset/absent nothing changes.
const previewAllowedHosts = (() => {
  if (process.env.BASE44_PREVIEW_MODE !== '1') return [];
  return [
    // Host the preview proxy actually sends: <port>-<sandbox id>.<sandbox domain>
    process.env.BASE44_SANDBOX_HOST_DOMAIN && `.${process.env.BASE44_SANDBOX_HOST_DOMAIN}`,
    // Public hostname the browser uses (this host is on port 3000).
    process.env.BASE44_PUBLIC_HOST_SUFFIX && `3000-${process.env.BASE44_PUBLIC_HOST_SUFFIX}`,
  ].filter((host): host is string => Boolean(host));
})();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    ...(previewAllowedHosts.length
      ? { allowedHosts: ['localhost', '127.0.0.1', ...previewAllowedHosts] }
      : {}),
  },
});
