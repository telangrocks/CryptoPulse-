module.exports = {
  // Basic formatting
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: true,
  trailingComma: 'none',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',
  
  // Line endings
  endOfLine: 'lf',
  
  // HTML formatting
  htmlWhitespaceSensitivity: 'css',
  
  // Vue formatting
  vueIndentScriptAndStyle: false,
  
  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',
  
  // Prose wrapping
  proseWrap: 'preserve',
  
  // Range formatting
  rangeStart: 0,
  rangeEnd: null,
  
  // Parser
  parser: undefined,
  
  // File path
  filepath: undefined,
  
  // Require pragma
  requirePragma: false,
  
  // Insert pragma
  insertPragma: false,
  
  // Override
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always'
      }
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    }
  ]
};
