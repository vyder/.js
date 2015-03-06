
// ================================================================
// 
// ExecutionDaemon
// 

define("execution-daemon",
       ["underscore", "moment"],
       function(_, moment) {

  var ExecutionDaemon = function() {
    this.initialize.apply(this, arguments);
  };
  _.extend(ExecutionDaemon.prototype, {
    /*
     * options:
     *    * 'fn'       - Function = To execute periodically every 'interval' amount of time
     *    * 'interval' - Number   = Number of seconds to wait between executions of 'fn'
     *    * 'for'      - String   = Indicates time to stay connected for, e.g. "24h"
     *    Recognized units: "m" - minutes
     *                      "h" - hours
     *                      "d" - days
     *                      "w" - weeks
     *    Defaults to "24h" - 24 hours
     */
    initialize: function(options) {
      this._running = false;

      if( !options['fn'] || typeof options['fn'] !== 'function' ) {
        throw new Error("Expected options['fn'] to be a function");
      }
      this._fn = options['fn'];

      if( !options['interval'] || typeof options['interval'] !== 'number' ) {
        throw new Error("Expected options['interval'] to be a Number");
      }
      this._interval = options['interval']*1000; // Save in milliseconds for ease of use

      var defaultPeriod = "24h";
      var periodString = options['for'] || defaultPeriod;
      if( typeof periodString !== 'string' || !periodString.match(/^\d+[mhdw]$/) ) {
        periodString = defaultPeriod;
      }
      var period = {
        value: Number(periodString.match(/^(\d+)([mhdw])$/)[1]),
        units: periodString.match(/^(\d+)([mhdw])$/)[2]
      };
      
      // Figure out when to auto-stop the daemon
      this._endTime = moment().add(period.value, period.units);

      this._executionID = null;

      this._disposed = false;
    },
    start: function() {
      if( this._disposed ) { throw new Error("This ExecutionDaemon has been disposed."); }

      if( !this._running ) {
        this._executionID = setInterval(_.bind(this._exec, this), this._interval);
        this._running = true;

        console.log("Daemon has started. Execution ID: " + this._executionID);
      }
    },
    stop: function() {
      if( this._disposed ) { throw new Error("This ExecutionDaemon has been disposed."); }

      if( this._running ) {
        clearInterval(this._executionID);
        console.log("Daemon has stopped. Execution ID: " + this._executionID);
        this._executionID = null;
        this._running = false;
      }
    },
    isRunning: function() {
      if( this._disposed ) { throw new Error("This ExecutionDaemon has been disposed."); }

      return this._running;
    },
    _exec: function() {
      if( this._disposed ) { throw new Error("This ExecutionDaemon has been disposed."); }

      if( this._running ) {
        if( moment().isBefore(this._endTime) ) {
          this._fn.call();
        } else {
          this.stop();
        }
      }
    },
    dispose: function() {
      if( this._disposed ) { throw new Error("This ExecutionDaemon has been disposed."); }

      this.stop();
      this._fn = null;
      this._interval = null;
      this._endTime = null;
      this._executionID = null;
      this._running = null;

      this._disposed = true;
    }
  });

  return ExecutionDaemon;
});

// ================================================================
// 
// main
// 

require(["underscore", "execution-daemon"], function(_, ExecutionDaemon) {
  var isLoggedIn = function() {
    return !$("#dialog").is(":visible");
  };
  var ensureLoggedIn = function() {
    if( !isLoggedIn() ) {
      console.log("Logging in...");
      $("input#username").attr('value', 'admin');
      $("input#password").attr('value', 'admin');
      $("#pop_login").click();
    }
  };
  var isConnected = function() {
    return ($("#index_connection_status").text() === "Connected");
  };
  var isConnecting = function() {
    return ($("#index_connection_status").text() === "Connecting...");
  };
  var clickConnectButton = function() {
    console.log("Clicking connect button...");
    $("#connect_btn").click();
  };
  var ensureConnection = function() {
    if( isConnected() ) {
      console.log("Still connected.");
    } else if( isConnecting() ) {
      console.log("Still connecting...");
    } else {
      clickConnectButton();
    }
  };

  // ================================================================

  var keepConnected = function() {
    ensureLoggedIn();
    ensureConnection();
  };

  window.ExecutionDaemon = ExecutionDaemon;

  var connectionDaemon = new ExecutionDaemon({
    fn: _.bind(keepConnected, this),
    interval: 5,
    period: "24h"
  });

  connectionDaemon.start();
});
