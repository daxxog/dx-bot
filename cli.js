/* DxBot / cli.js
 * command line interface for DxBot
 * (c) 2015 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

var DxBot = require('./dx-bot.min.js');

new DxBot(process.argv[2], process.argv[3], process.argv[4]);
