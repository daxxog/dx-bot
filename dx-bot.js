/* DxBot
 * my jd bot
 * (c) 2015 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

/* UMD LOADER: https://github.com/umdjs/umd/blob/master/returnExports.js */
(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(factory);
    } else {
        // Browser globals (root is window)
        root.DxBot = factory();
  }
}(this, function() {
    var JustBot = require('just-bot'),
        Big = require('big.js'),
        DxBot;
    
    Big.RM = 0; //round down
    Big.DP = 8; //eight decimal places as per bitcoin spec
    
    DxBot = function(hash, owner) {
        var that = this;
        
        this.run = false;
        this.loss = 0;
        this.owner = owner;
        this.bot = new JustBot(hash);
        this.out = new Big('0.001');
        this.jar = new Big(0);
        this.bet = [
            {
                loss: 0,
                stop: 1,
                shout: true,
                stake: '0.1',
                tip: '0.00000988',
                bet: '0.00000001'
            },
            {
                loss: 1,
                stop: 2,
                shout: true,
                stake: '1',
                tip: '0.00000097',
                bet: '0.00000001'
            },
            {
                loss: 2,
                stop: 10,
                stake: '9',
                tip: '0.00000009',
                bet: '0.00000001'
            },
            {
                loss: 10,
                stop: 11,
                stake: '98.0198',
                tip: '0.00000001',
                bet: '0.00002'
            },
            {
                loss: 11,
                reset: true,
                jar: '0.00002',
                stake: '98.0198',
                bet: '0'
            }
        ];
        
        this.bot.on('ready', function() {
            that.bot.msg(owner, 'dx bot is ready: '+that.bot.name + '; balance: ' + that.bot.balance);
        });
        
        this.bot.on('msg', function(msg) {
            if(msg.user === owner) {
                switch(msg.txt) {
                    case 'jar':
                        that.bot.msg(owner, JustBot._tidy(that.jar));
                      break;
                    case 'balance':
                        that.bot.msg(owner, that.bot.balance);
                      break;
                    case 'start':
                        that.run = true;
                        that.roll();
                        that.bot.msg(owner, 'bot started');
                      break;
                    case 'stop':
                        that.run = false;
                        that.bot.msg(owner, 'bot stopped');
                      break;
                }
            }
        });
        
        this.bot.on('result', function(res) {
            if(res.win === false) {
                that.loss++;
            } else if(res.win === true) {
                that.bet.forEach(function(v) {
                    if(res.chance === v.stake) {
                        if(v.shout === true) {
                            that.bot.msg(owner, 'won #' + res.betid + ' at ' + res.chance + '%');
                        }
                        
                        if(typeof v.tip === 'string') {
                            that.jar = that.jar.plus(v.tip);
                            
                            if(that.jar.gte(that.out)) {
                                that.bot.msg(owner, 'sending tip jar :)');
                                that.bot.tip(owner, that.jar);
                                that.jar = new Big(0);
                            }
                        }
                    }
                });
            
                that.loss = 0;
            }
            
            that.roll();
        });
    };
    
    DxBot.prototype.roll = function() {
        var that = this,
            didRoll = false;
        
        if(this.run === true) {
            this.bet.forEach(function(v) {
                if(that.loss >= v.loss && v.reset === true) {
                    that.loss = 0;
                    that.jar = that.jar.minus(v.jar); //subtract from jar to cover loss
                    that.bot.roll(v.stake, v.bet, Math.random() > 0.5);
                    didRoll = true;
                }
                
                if(that.loss >= v.loss && that.loss < v.stop) {
                    that.bot.roll(v.stake, v.bet, Math.random() > 0.5);
                    didRoll = true;
                }
            });
            
            if(didRoll === false) {
                that.run = false;
                that.bot.msg(that.owner, 'bot stopped');
            }
        }
    };
    
    return DxBot;
}));
