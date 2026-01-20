// const esbuild = require( 'esbuild' );

// const production = process.argv.includes( '--production' );
// const watch = process.argv.includes( '--watch' );

// async function main() {
//   const ctx = await esbuild.context( {
//     entryPoints: ['src/extension.ts'],
//     bundle: true,
//     format: 'cjs',
//     minify: production,
//     sourcemap: !production,
//     sourcesContent: false,
//     platform: 'node',
//     outfile: 'dist/extension.js',
//     external: ['vscode'],
//     logLevel: 'warning',
//     plugins: [
//       /* add to the end of plugins array */
//       esbuildProblemMatcherPlugin
//     ]
//   } );
//   if ( watch ) {
//     await ctx.watch();
//   } else {
//     await ctx.rebuild();
//     await ctx.dispose();
//   }
// }

// /**
//  * @type {import('esbuild').Plugin}
//  */
// const esbuildProblemMatcherPlugin = {
//   name: 'esbuild-problem-matcher',

//   setup( build ) {
//     build.onStart( () => {
//       console.log( '[watch] build started' );
//     } );
//     build.onEnd( result => {
//       result.errors.forEach( ( { text, location } ) => {
//         console.error( `✘ [ERROR] ${text}` );
//         if ( location === null ) return;
//         console.error( `    ${location.file}:${location.line}:${location.column}:` );
//       } );
//       console.log( '[watch] build finished' );
//     } );
//   }
// };

// main().catch( e => {
//   console.error( e );
//   process.exit( 1 );
// } );

// esBuild.js
const esbuild = require( 'esbuild' );

const production = process.argv.includes( '--production' );
const watch = process.argv.includes( '--watch' );

async function main() {
  const ctx = await esbuild.context( {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'warning',
    plugins: [esbuildProblemMatcherPlugin]
  } );

  if ( watch ) {
    // start watch mode; plugin prints the exact lines the problem matcher expects
    await ctx.watch();
    // keep process alive while watch runs
  } else {
    // one-shot build for CI or single-run builds
    await ctx.rebuild();
    await ctx.dispose();
  }
}

/**
 * Plugin that emits the exact console output expected by the esbuild problem matcher
 * - Begin marker:  [watch] build started
 * - Error lines:   > path/to/file:line:col: error: message
 * - End marker:    [watch] build finished
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup( build ) {
    build.onStart( () => {
      console.log( '[watch] build started' );
    } );

    build.onEnd( result => {
      // Print errors in the exact format the matcher expects
      if ( result.errors && result.errors.length ) {
        result.errors.forEach( err => {
          const loc = err.location;
          if ( loc && loc.file ) {
            // stderr line with leading ">" and "error:" token
            console.error( `> ${loc.file}:${loc.line}:${loc.column}: error: ${err.text}` );
          } else {
            console.error( `> error: ${err.text}` );
          }
        } );
      }
      console.log( '[watch] build finished' );
    } );
  }
};

main().catch( e => {
  console.error( e );
  process.exit( 1 );
} );