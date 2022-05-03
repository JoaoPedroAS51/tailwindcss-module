import { join, relative } from 'path';
import { existsSync } from 'fs';
import defu from 'defu';
import chalk from 'chalk';
import { withTrailingSlash } from 'ufo';
import consola from 'consola';
import { defineNuxtModule, resolvePath, resolveAlias, createResolver, requireModule, addTemplate, isNuxt2, installModule, addServerMiddleware } from '@nuxt/kit';

const name = "@nuxtjs/tailwindcss";
const version = "5.0.4";

const defaultTailwindConfig = ({ srcDir }) => ({
  theme: {
    extend: {}
  },
  plugins: [],
  content: [
    `${srcDir}/components/**/*.{vue,js,ts}`,
    `${srcDir}/layouts/**/*.vue`,
    `${srcDir}/pages/**/*.vue`,
    `${srcDir}/composables/**/*.{js,ts}`,
    `${srcDir}/plugins/**/*.{js,ts}`,
    `${srcDir}/App.js`,
    `${srcDir}/App.ts`,
    `${srcDir}/App.vue`,
    `${srcDir}/app.js`,
    `${srcDir}/app.ts`,
    `${srcDir}/app.vue`
  ]
});

const logger = consola.withScope("nuxt:tailwindcss");
const module = defineNuxtModule({
  meta: {
    name,
    version,
    configKey: "tailwindcss"
  },
  defaults: (nuxt) => ({
    configPath: "tailwind.config",
    cssPath: join(nuxt.options.dir.assets, "css/tailwind.css"),
    config: defaultTailwindConfig(nuxt.options),
    viewer: true,
    exposeConfig: false,
    injectPosition: 0
  }),
  async setup(moduleOptions, nuxt) {
    const configPath = await resolvePath(moduleOptions.configPath, {
      extensions: [".js", ".ts"]
    });
    const cssPath = moduleOptions.cssPath && resolveAlias(moduleOptions.cssPath);
    const injectPosition = ~~Math.min(moduleOptions.injectPosition, (nuxt.options.css || []).length + 1);
    if (typeof cssPath === "string") {
      if (existsSync(cssPath)) {
        logger.info(`Using Tailwind CSS from ~/${relative(nuxt.options.srcDir, cssPath)}`);
        nuxt.options.css.splice(injectPosition, 0, cssPath);
      } else {
        const resolver = createResolver(import.meta.url);
        nuxt.options.css.splice(injectPosition, 0, resolver.resolve("runtime/tailwind.css"));
      }
    }
    let tailwindConfig = {};
    if (existsSync(configPath)) {
      tailwindConfig = requireModule(configPath, { clearCache: true });
      logger.info(`Merging Tailwind config from ~/${relative(nuxt.options.srcDir, configPath)}`);
      if (Array.isArray(tailwindConfig.purge)) {
        tailwindConfig.content = tailwindConfig.purge;
      }
    }
    tailwindConfig = defu.arrayFn(tailwindConfig, moduleOptions.config);
    if (moduleOptions.exposeConfig) {
      const resolveConfig = await import('tailwindcss/resolveConfig.js').then((r) => r.default || r);
      const resolvedConfig = resolveConfig(tailwindConfig);
      const template = addTemplate({
        filename: "tailwind.config.mjs",
        getContents: () => `export default ${JSON.stringify(resolvedConfig, null, 2)}`
      });
      addTemplate({
        filename: "tailwind.config.d.ts",
        getContents: () => 'declare const config: import("tailwindcss/tailwind-config").TailwindConfig\nexport { config as default }',
        write: true
      });
      nuxt.options.alias["#tailwind-config"] = template.dst;
    }
    if (nuxt.options.dev) {
      nuxt.options.watch.push(configPath);
    }
    await nuxt.callHook("tailwindcss:config", tailwindConfig);
    tailwindConfig._hash = String(Date.now());
    const postcssOptions = nuxt.options.postcss || nuxt.options.build.postcss.postcssOptions || nuxt.options.build.postcss;
    postcssOptions.plugins = postcssOptions.plugins || {};
    postcssOptions.plugins["tailwindcss/nesting"] = postcssOptions.plugins["tailwindcss/nesting"] ?? {};
    postcssOptions.plugins["postcss-custom-properties"] = postcssOptions.plugins["postcss-custom-properties"] ?? {};
    postcssOptions.plugins.tailwindcss = tailwindConfig;
    if (isNuxt2()) {
      await installModule("@nuxt/postcss8");
    }
    if (nuxt.options.dev && moduleOptions.viewer) {
      const route = "/_tailwind/";
      const createServer = await import('tailwind-config-viewer/server/index.js').then((r) => r.default || r);
      const { withoutTrailingSlash } = await import('ufo');
      const _viewerDevMiddleware = createServer({ tailwindConfigProvider: () => tailwindConfig }).asMiddleware();
      const viewerDevMiddleware = (req, res) => {
        if (req.originalUrl === withoutTrailingSlash(route)) {
          res.writeHead(301, { Location: withTrailingSlash(req.originalUrl) });
          res.end();
        }
        _viewerDevMiddleware(req, res);
      };
      addServerMiddleware({ route, handler: viewerDevMiddleware });
      nuxt.hook("listen", (_, listener) => {
        const fullPath = `${withoutTrailingSlash(listener.url)}${route}`;
        logger.info(`Tailwind Viewer: ${chalk.underline.yellow(fullPath)}`);
      });
    }
  }
});

export { module as default };
