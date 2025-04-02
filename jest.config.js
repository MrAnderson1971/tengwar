module.exports = {
    transform: {
        '^.+\\.[tj]sx?$': 'babel-jest',
    },
    transformIgnorePatterns: [
        // Tell Jest to transform node_modules/cmu-pronouncing-dictionary
        '/node_modules/(?!(cmu-pronouncing-dictionary)/)',
    ],
}
