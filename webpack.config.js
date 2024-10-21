const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
    plugins: [
        new NodePolyfillPlugin()
    ],
    resolve: {
        fallback: {
            global: require.resolve('global')
        }
    }
};
