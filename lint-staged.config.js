module.exports = {
    '{src,tests}/**/*.ts': ['prettier --write', 'eslint --fix'],
    '{src,tests}/**/*.{json,md,yml}': ['prettier --write'],
};
