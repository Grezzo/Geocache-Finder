/*globals require*/ //Stop complaining about require being undefined!
var helper = require("helpers");
var location = require("location");

/*globals module*/ //Stop complaining about module being undefined!
module.exports.getCachesNearCoords = getCachesNearCoords;
module.exports.getCacheDetails = getCacheDetails;
module.exports.getLoggedInUser = getLoggedInUser;
module.exports.logInToGeocaching = logInToGeocaching;
module.exports.stopLocationUpdates = stopLocationUpdates;

//Patterns for parsing the result of a (detailed) search:
var PATTERN_LATLON = /<span id="uxLatLon"[^>]*>(.*?)<\/span>/;
//var PATTERN_NAME = /<span id="ctl00_ContentBody_CacheName">\W*(.*?)\W*<\/span>/;

//Pattern for parsing the logged in user:
var PATTERN_LOGIN_NAME = /class="li-user-info"[^>]*>\W*?<span>(.*?)<\/span>/;

//Patterns for parsing the result of a search:
var PATTERN_SEARCH_GEOCODE = /\|\W*(GC[0-9A-Z]+)[^\|]*\|/;
var PATTERN_SEARCH_DISTANCE = /<span class="small NoWrap"><img[^>]+>[NSEW]+<br \/>\W*([^<]+)\W*<\/span>/;
var PATTERN_SEARCH_NAME = /<span>\W*([^<]+)\W*<\/span><\/a>/;
var PATTERN_VIEWSTATES = /id="__VIEWSTATE\d*"\W*value="([^"]+)"/g;

var locationWatcher; //location watcher object

function stopLocationUpdates() {
  navigator.geolocation.clearWatch(locationWatcher);
}

function parseSearchResultsPage(page) {

  //Get viewstates
  var viewstates = [];
  var viewstate;
  while ((viewstate = PATTERN_VIEWSTATES.exec(page)) !== null) {
    viewstates.push(viewstate[1]);
  }

  
  //Get geocaches
  var geocaches = [];  
  
  //Get only rows of search results (discard start and end)
  var startPos = page.substring(0, page.indexOf("Data BorderTop")).lastIndexOf("<tr");
  var endPos = page.indexOf("</table>", startPos);
  page = page.substring(startPos, endPos);

  //Split rows
  var rows = page.split("</tr>");
  // Remove last item in array because it's empty
  rows.pop();
  
  //Parse each row
  rows.forEach(function(row, index) {
    //Filter out premium/found/disabled caches
    if (
      !(
        row.indexOf("Premium Member Only Cache") != -1 &&
        localStorage.getItem("show_premium") === "false"
      ) && !(
        row.indexOf("Found It") != -1 &&
        localStorage.getItem("show_found") === "false"
      ) && (
        row.indexOf("class=\"lnk  Strike\"") === -1
      )
    ) {
      var geocode = row.match(PATTERN_SEARCH_GEOCODE)[1];
      var name = helper.htmlUnescape(row.match(PATTERN_SEARCH_NAME)[1]);
      var distance = row.match(PATTERN_SEARCH_DISTANCE)[1];
      //Join with ASCII unit separator
      geocaches.push([geocode, name, distance].join(String.fromCharCode(31)));
    }
  });
  return {
    geocaches: geocaches,
    viewstates: viewstates
  };
}


function constructFormDataForNextPage(viewstates) {
  var formData = "__EVENTTARGET=" + encodeURIComponent("ctl00$ContentBody$pgrTop$ctl08") +
    "&__VIEWSTATEFIELDCOUNT=" + viewstates.length;

  viewstates.forEach(function(viewstate, index) {
    formData += "&__VIEWSTATE";
    if (index > 0) {
      formData += index;
    }
    formData += "=" + encodeURIComponent(viewstate);
  });
  
  return formData;
}




function getCachesNearCoords(coords) {
  var geocacheList = [];
  var searchURL = "https://www.geocaching.com/seek/nearest.aspx?lat=" + coords.latitude + "&lng=" + coords.longitude;
  console.log("Getting list of geocaches from " + searchURL);  
  var req = new XMLHttpRequest();
  req.open("POST", searchURL, false);
  //formdata must be submitted to get page 2 results if necesarry
  var formData = "";
  while (geocacheList.length < 20) {
    req.send(formData);
    if (req.status === 200) {
      var reply = parseSearchResultsPage(req.responseText);
      //Add new geocaches to list
      geocacheList = helper.combineArrays(geocacheList, reply.geocaches);
      formData = constructFormDataForNextPage(reply.viewstates);
    }
  }
  geocacheList = geocacheList.slice(0, 20);
    
  //Join with ASCII record separator
  var geocacheListAsString = geocacheList.join(String.fromCharCode(30));
  console.log("Got a list of Geocachess");

  //Tell pebble that I've got a bunch of nearby geocaches
  Pebble.sendAppMessage({ 'AppKeyGeocacheList': geocacheListAsString },
                        function(e) {
                          console.log("Sent a list of geocaches to watch");
                        },
                        function(e) {
                          console.log("Failed to send a list of geocaches to watch." +
                                      " Error is: " + e.data.error.message);
                        });
}

function getCacheDetails(geocode) {
  var URL = "https://www.geocaching.com/seek/cache_details.aspx?wp=" + geocode;
  var req = new XMLHttpRequest();
  req.open("GET", URL, false);
  req.send();
  if (req.status === 200) {
    var destCoords = helper.getDecimalDegrees(req.responseText.match(PATTERN_LATLON)[1]);
    locationWatcher = navigator.geolocation.watchPosition(function(currPosition) {
    var distanceAndBearing = location.distanceAndBearing(
      currPosition.coords.latitude,
      currPosition.coords.longitude,
      destCoords.latitude,
      destCoords.longitude,
      true
    );
    Pebble.sendAppMessage({
      'AppKeyDistance': distanceAndBearing.distance + " ± " + /*Math.round(*/currPosition.coords.accuracy/*)*/ + "m",
      'AppKeyBearing': distanceAndBearing.bearing
    },
                          function(e) {
                            console.log("Sent Location to watch");
                          },
                          function(e) {
                            console.log("Failed to send location to watch." +
                                        " Error is:"  + e.data.error.message);
                          });
    });
  }
}

function getLoggedInUser() {
  var req = new XMLHttpRequest();
  req.open("POST", "https://www.geocaching.com/", false);
  req.send();
  if (req.status === 200) {
    var match = req.responseText.match(PATTERN_LOGIN_NAME);
    if (match === null) {
      return null;
    } else {
      return match[1];
    }
  }
}

function logOutOfGeocaching() {
  var req = new XMLHttpRequest();
  req.open("GET", "https://www.geocaching.com/login/default.aspx?RESET=Y", false);
  console.log("Logging out");
  req.send();
  if (req.status === 200) {
    var loggedInUser = getLoggedInUser();
    if (loggedInUser === null) {
      console.log("Logged out");
    } else {
      console.log("Failed to log out. Still logged in as " + loggedInUser);
    }
  }
}

function logInToGeocaching() {
  //
  //TODO: Check to see whether username and password have been configured
  //
  var username = localStorage.getItem("username");
  var loggedInUser = getLoggedInUser();
  if (loggedInUser) {
    console.log(loggedInUser + " is already logged in");
    if (helper.caseInsensitiveCompare(loggedInUser, username)) {
      console.log("...so don't need to log in");
      return;
    } else {
      console.log("...so will log out first");
      logOutOfGeocaching();
    }
  }
  console.log("Logging in as " + username);
  var req = new XMLHttpRequest();

  var params = "&__EVENTTARGET=&__EVENTARGUMENT=" + 
      "&ctl00$ContentBody$tbUsername=" + username +
      "&ctl00$ContentBody$tbPassword=" + localStorage.getItem("password") +
      "&ctl00$ContentBody$cbRememberMe=on&ctl00$ContentBody$btnSignIn=Login";
  req.open("POST", "https://www.geocaching.com/login/default.aspx", false);
  //Send the proper header information along with the request
  req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  req.setRequestHeader("Content-length", params.length);
  req.setRequestHeader("Connection", "close");
  req.send(params);
  loggedInUser = getLoggedInUser();
  if (loggedInUser) {
    console.log("Logged in as " + loggedInUser);
    localStorage.setItem("username", loggedInUser);
    return true;
  } else {
    console.log("Failed to log in");
    return false;
  }
}