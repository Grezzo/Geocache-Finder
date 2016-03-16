/*
  TODO: Test on Android (cookies may not be passed on xmlHttpRequests, and config page may not load)
  currently tries to log if as null is not configured

        be able to choose miles or kilometers
detect no username/password
detect no config
check username/password on config update and reject if necesarry
        keep searching until 20 caches found AFTER filter applied
        log in before getting cache details
        save username as proper case (it does when reconfigured with new username, but if username is not changed, it's saved in case that it was typed in, not what GC returns);
 accuracy is always in m (even if non metric is selected)       
*/


/*globals require*/ //Stop complaining about require being undefined!
var config = require("config");
var gc = require("gc-connector");

function getNearbyGeocaches() {
  console.log("Getting location...");
  var locationWatcher = navigator.geolocation.watchPosition( function(position) {
    var accuracy = 100;
    
    if ((Pebble.getActiveWatchInfo().model.indexOf("qemu_platform_") != -1)) {
      console.log('Detected emulator in use, decreasing GPS accuracy');
      accuracy = 1000;
    }
    
    if (position.coords.accuracy <= accuracy) {
      console.log("Location accuracy (" + position.coords.accuracy + "m) is good");
      navigator.geolocation.clearWatch(locationWatcher);
      gc.getCachesNearCoords(position.coords);
    } else {
      console.log("Location accuracy (" + position.coords.accuracy + "m) not good enough yet");
    }
  });
}





//------------------------------------------
//----------------Messaging-----------------
//------------------------------------------


// Set callback for appmessage events
Pebble.addEventListener('appmessage', function(e) {
  console.log('JS received message from pebble');
  
  if (e.payload.AppKeyGetGeocaches) {
    console.log("...and it says to get geocaches");
    gc.logInToGeocaching();
    getNearbyGeocaches();
    
  } else if (e.payload.AppKeyGetCacheDetails) {
    var geocode = e.payload.AppKeyGetCacheDetails;
    console.log("...and it says to get details on " + geocode);
    gc.getCacheDetails(geocode);

  } else if (e.payload.AppKeyGetSettings) {
    console.log("...and it says to get settings");
    config.sendSettings();
    
  } else if ('AppKeySetShowPremium' in e.payload) {
    console.log("...and it says to " + (e.payload.AppKeySetShowPremium ? "show" : "hide") + " premium caches");
    localStorage.setItem("show_premium", e.payload.AppKeySetShowPremium ? "true" : "false");
    
  } else if ('AppKeySetShowFound' in e.payload) {
    console.log("...and it says to " + (e.payload.AppKeySetShowFound ? "show" : "hide") + " found caches");
    localStorage.setItem("show_found", e.payload.AppKeySetShowFound ? "true" : "false");
    
  } else if ('AppKeyStopLocationUpdates' in e.payload) {
    console.log("...and it says to stop getting location updates");
    gc.stopLocationUpdates();
  }
  
});







//------------------------------------------
//-------------------Main-------------------
//------------------------------------------
Pebble.addEventListener('showConfiguration', config.showConfigWindow);
Pebble.addEventListener('webviewclosed', config.processConfig);
Pebble.addEventListener("ready", function(e) {
  console.log("JavaScript ready");
  // Notify the watchapp that it is now safe to send messages
  Pebble.sendAppMessage({ 'AppKeyReady': true },
                        function(e) {
                          console.log("Told watch that JS is ready");
                        },
                        function(e) {
                          console.log("Failed to tell watch that JS is ready." +
                                      " Error is:"  + e.data.error.message);
                        });
});