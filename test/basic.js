/* DxBot / test / basic.js
 * basic test
 * (c) 2015 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

var vows = require('vows'),
    assert = require('assert'),
    DxBot = require('../dx-bot.min.js');

vows.describe('basic').addBatch({
    'DxBot': {
        topic: function() {
        	return typeof DxBot;
        },
        'is a function': function(topic) {
            assert.equal(topic, 'function');
        }
    }
}).export(module);