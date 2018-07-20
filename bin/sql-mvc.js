
var program = require('commander');

program
  .usage('new <name_of_your_project>|patch|forever path')
  //.version(quicc.version)
  .option('-m, --minimal', 'minimal install (no demo)')
  .option('-c, --coffee', 'use CoffeeScript')
  .option('-j, --jade', 'use Jade for Views')
  .option('-s, --stylus', 'use Stylus for CSS')
  .option('-l, --less', 'use Less for CSS')
  .option('-r, --repl', 'include Console Server / REPL')
  .parse(process.argv);

require(__dirname + '/../lib/cli').process(program);
