const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

/**
 * Widget Webpack Configuration
 * Optimizes the chat widget for CDN distribution with minimal bundle size
 */

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const isProduction = argv.mode === 'production';

  return {
    mode: argv.mode || 'production',
    entry: './src/index.js',
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isDevelopment ? 'widget.js' : 'widget.min.js',
      library: 'CRMWidget',
      libraryTarget: 'umd',
      umdNamedDefine: true,
      globalObject: 'typeof self !== "undefined" ? self : this',
      // Enable async chunks for code splitting
      chunkFilename: isDevelopment ? '[name].js' : '[name].[contenthash:8].js',
      // Clean output directory before build
      clean: true,
    },

    module: {
      rules: [
        // JavaScript/JSX
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: '> 0.5%, last 2 versions, Firefox ESR, not dead',
                  modules: false,
                  useBuiltIns: 'usage',
                  corejs: 3,
                }],
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript',
              ],
              plugins: [
                '@babel/plugin-transform-runtime',
              ],
            },
          },
        },
        // CSS Modules
        {
          test: /\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: false,
              },
            },
          ],
        },
      ],
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },

    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction,
              pure_funcs: ['console.log', 'console.info', 'console.debug'],
              passes: 2,
            },
            mangle: true,
            output: {
              comments: false,
              beautify: false,
            },
          },
          extractComments: false,
        }),
      ],
      usedExports: true,
      sideEffects: false,
      // Split large dependencies
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Vendor code
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          // Common code shared between chunks
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
      moduleIds: 'deterministic',
      runtimeChunk: 'single',
    },

    // Development server
    devServer: isDevelopment ? {
      port: 3000,
      hot: true,
      compress: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
      static: {
        directory: path.join(__dirname, 'dist'),
      },
    } : undefined,

    devtool: isDevelopment ? 'source-map' : false,

    plugins: [
      // Gzip compression for production
      ...(isProduction ? [
        new CompressionPlugin({
          filename: '[path][base].gz',
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8,
        }),
      ] : []),
    ],

    performance: {
      maxEntrypointSize: 250000,
      maxAssetSize: 250000,
      hints: isProduction ? 'warning' : false,
    },

    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false,
    },
  };
};
