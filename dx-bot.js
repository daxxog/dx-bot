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
        MongoClient = require('mongodb').MongoClient,
        S = require('string'),
        Big = require('big.js'),
        DxBot, tenK = new Big('10000');
    
    Big.RM = 0; //round down
    Big.DP = 8; //eight decimal places as per bitcoin spec
    
    DxBot = function(hash, owner, url) {
        var that = this;
        
        if(typeof url === 'string') {
            MongoClient.connect(url, function(err, db) {
                if(!err) {
                    that.smart = db.collection('smart');
                } else {
                    console.error(err);
                }
            });
        }
        
        this.run = false;
        this.loss = 0;
        this.owner = owner;
        this.bot = new JustBot(hash);
        this.out = new Big('0.001');
        this.jar = new Big(0);
        this.streak = new Big(0);
        this.lucky = 500000;
        this.strategy = true;
        this.stats = [];
        
        this.bet = [
            {
                loss: 0,
                stop: 1,
                shout: true,
                stake: '1',
                bet: '0.0000001'
            },
            {
                loss: 1,
                stop: 2,
                smart: true,
                stake: '0.1',
                bet: '0.0000001'
            },
            {
                loss: 2,
                stop: 10,
                stake: '9',
                bet: '0.0000001'
            },
            {
                loss: 10,
                stop: 11,
                shout: false,
                stake: '98.0198',
                bet: '0.0002'
            },
            {
                loss: 11,
                stop: 12,
                streak: '0.00006',
                smart: true,
                bet: '0.00002',
                stake: '49.5'
            }
        ];
        
        this.bot.on('ready', function() {
            that.bot.msg(owner, 'dx bot is ready: ' + that.bot.name + '; balance: ' + that.bot.balance);
        });
        
        this.bot.on('msg', function(msg) {
            if(msg.user === owner) {
                switch(msg.txt) {
                    case 'jar':
                        that.bot.msg(owner, JustBot._tidy(that.jar));
                      break;
                    case 'streak':
                        that.bot.msg(owner, JustBot._tidy(that.streak));
                      break;
                    case 'balance':
                        that.bot.msg(owner, that.bot.balance);
                      break;
                    case 'lucky':
                        that.bot.msg(owner, that.lucky);
                      break;
                    case 'hilo':
                        that.bot.msg(owner, that.hilo() ? 'hi' : 'lo');
                      break;
                    case 'strategy':
                        that.bot.msg(owner, that.strategy);
                      break;
                    case 'drop':
                        if(typeof that.smart !== 'undefined') {
                            that.smart.drop();
                            that.bot.msg(owner, 'dropped smart db');
                        }
                      break;
                    case 'smart':
                        if(typeof that.smart !== 'undefined') {
                            that.bot.msg(owner, 'smart stats: ' + JSON.stringify(that.stats) + '; weight: ' + JustBot._tidy(that.weight));
                        }
                      break;
                    case 'start':
                        that.run = true;
                        that.streak = new Big(0);
                        that.roll();
                        that.bot.msg(owner, 'bot started');
                      break;
                    case 'stop':
                        that.run = false;
                        that.bot.msg(owner, 'bot stopped');
                      break;
                    case 'help':
                        that.bot.msg(owner, 'commands: jar, streak, balance, lucky, hilo, strategy, drop, smart, start, stop');
                }
            }
        });
        
        this.bot.on('result', function(res) {
            var profit = S(res.this_profit).replaceAll('+', '').s,
                streaked = false, smart = false;
            
            that.jar = that.jar.plus(profit);
            that.lucky = res.lucky;
            
            if(typeof that.smart !== 'undefined') {
                var rng = that.rng();
                
                if(rng > 999500) { //randomly drop the smart db
                    that.bot.msg(that.owner, 'dropped smart db lucky #' + res.betid);
                    that.smart.drop();
                }
                
                that.smart.insert({
                    lucky: res.lucky,
                    win: res.win,
                    unlucky: res.lucky > 495000 && res.lucky < 504999,
                    range: res.lucky > 495000 && !(res.lucky < 504999),
                    high: res.high
                }, function(err) {
                    if(err) {
                        console.error(err);
                    }
                });
            }
            
            if(that.stats.length === 2) {
                var select = 0;
                
                if(that.stats[0] > that.stats[1]) {
                    select = that.strategy ? 0 : 1;
                }
                
                if(that.stats[1] > that.stats[0]) {
                    select = that.strategy ? 1 : 0;
                }
                
                smart = new Big(that.stats[select]).div(tenK).plus('0.1').round(1);
                
                if(that.strategy) { //invert number on high
                    smart = new Big(100).minus(smart);
                }
                
                smart = JustBot._tidy(smart);
            }
            
            if(res.win === false) {
                if(that.rng() > 900000) { //randomly change the bet strategy on loose
                    that.getStats();
                }
                
                that.bet.forEach(function(v, i) {
                    if(res.chance === v.stake) {
                        
                        streaked = that.streaked(v, profit);
                        
                        if(v.smart === true && smart !== false) {
                            that.bet[i].stake = smart;
                        }
                        
                        if(v.shout === false) {
                            that.bot.msg(owner, 'lost #' + res.betid + ' at ' + res.chance + '%');
                        }
                    }
                });
                
                if(streaked === false) {
                    that.loss++;
                }
            } else if(res.win === true) {
                if(that.jar.gte(that.out)) {
                    that.bot.msg(owner, 'sending tip jar :)');
                    that.bot.tip(owner, that.jar);
                    that.jar = new Big(0);
                }
                
                that.bet.forEach(function(v) {
                    if(res.chance === v.stake) {
                        streaked = that.streaked(v, profit);
                        
                        if(v.shout === true) {
                            that.bot.msg(owner, 'won #' + res.betid + ' at ' + res.chance + '%');
                        }
                    }
                });
                
                if(streaked === false) {
                    that.loss = 0;
                }
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
                    that.bot.roll(v.stake, v.bet, that.hilo());
                    didRoll = true;
                }
                
                if(that.loss >= v.loss && that.loss < v.stop) {
                    that.bot.roll(v.stake, v.bet, that.hilo());
                    didRoll = true;
                }
            });
            
            if(didRoll === false) {
                that.run = false;
                that.bot.msg(that.owner, 'bot stopped');
            }
        }
    };
    
    DxBot.prototype.streaked = function(v, profit) {
        var streaked = (typeof v.streak === 'string') && this.loss >= v.loss;
        
        if(streaked === true) {
            this.streak = this.streak.plus(profit);
            
            if(this.streak.gte(v.streak)) {
                streaked = false;
                this.bot.msg(this.owner, 'cleared loosing streak with ' + JustBot._tidy(this.streak));
                this.streak = new Big(0);
                this.loss = 0;
            }
        }
        
        return streaked;
    };
    
    DxBot.prototype.rng = function() {
        return Math.random() * 1000000;
        //return this.lucky;
    };
    
    DxBot.prototype.hilo = function() {
        return this.strategy;
    };
    
    DxBot.prototype.getStats = function() {
        var that = this;
        
        if(typeof that.smart !== 'undefined') {
            this.smart.aggregate([
                {
                    $match: {
                        unlucky: false,
                    }
                },
                {
                    $group: {
                        _id: "$range",
                        avgLuck: {
                            $avg: '$lucky'
                        }
                    }
                }
            ], function(err, docs) {
                if(!err) {
                    that.stats = docs.map(function(v, i, a) {
                        if(v._id === true) {
                            if(i === 1) {
                                return v.avgLuck;
                            } else if(i === 0) {
                                return a[1].avgLuck;
                            }
                        } else if(v._id === false) {
                            if(i === 0) {
                                return v.avgLuck;
                            } else if(i === 1) {
                                return a[0].avgLuck;
                            }
                        }
                    });
                    
                    
                    var weight = that.stats.map(function(v, i) {
                        if(v > 504999) {
                            return v - 504999;
                        } else if(v < 490000) {
                            return (490000 - v) * (-1);
                        } else {
                            return 0;
                        }
                    }).reduce(function(p, c) {
                        return p + c;
                    }, 0), old = that.strategy;
                    
                    that.weight = weight;
                    that.strategy = weight > 0; //find the best strategy
                    
                    if(that.strategy !== old) {
                        that.bot.msg(that.owner, 'strategy changed to ' + (that.hilo() ? 'hi' : 'lo') + '; weight: ' + weight);
                    }
                } else {
                    console.error(err);
                }
            });
        }
    };
    
    return DxBot;
}));
