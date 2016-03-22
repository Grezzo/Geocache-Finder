/*
  TODO: Test on Android (cookies may not be passed on xmlHttpRequests, and config page may not load)
  currently tries to log if as null is not configured
  
detect premium user
 - https://www.geocaching.com/account/settings/membership
 - /<dt>Membership<\/dt>\s*<dd>\s*(.*)\s*<\/dd>/
 - will be "Basic", or "Premium" or "Charter" (charter is premium since start)
 - check for premium or charter, fall back to basic

detect no username/password
detect no config
check username/password on config update and reject if necesarry
        log in before getting cache details
 
 
 If matches then user is logged in:
 - PATTERN_MAP_LOGGED_IN = Pattern.compile("<a href=\"https?://www.geocaching.com/my/\" class=\"CommonUsername\"");

Username:
 - on login page
   - PATTERN_LOGIN_NAME_LOGIN_PAGE = Pattern.compile("ctl00_ContentBody_lbUsername\">.*<strong>(.*)</strong>");
 - on any other page
   - PATTERN_LOGIN_NAME = Pattern.compile("class=\"li-user-info\"[^>]*>.*?<span>(.*?)</span>", Pattern.DOTALL);


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
    
  } else if ('AppKeySetMetric' in e.payload) {
    console.log("...and it says to use " + (e.payload.AppKeySetMetric ? "metric" : "imperial"));
    localStorage.setItem("metric", e.payload.AppKeySetMetric ? "true" : "false");
    
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