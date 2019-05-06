import typescript from "rollup-plugin-typescript";
export default {
    input: 'src/extension.ts',
    output: {
        file: 'dist/extension.js',
        format: 'cjs'
    },
    plugins: [
        typescript({
            "target": "ES2015",
            "sourceMap": false
        })
    ]
};
