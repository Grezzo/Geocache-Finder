/*globals module*/ //Stop complaining about module being undefined!
module.exports.distanceAndBearing = distanceAndBearing;

var metresInYard = 0.9144; // Length of a yard in metres
var yardsInMile = 1760; //Number of yards in a mile
var R = 6371000; // Radius of the earth in metres

function toRadians(degrees) {
  return degrees / (180 / Math.PI);
}

function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

function distanceAndBearing(currLat, currLon, destLat, destLon, metric) {
  var deltaLat = toRadians(destLat-currLat);
  var deltaLon = toRadians(destLon-currLon);

  var currLatRad = toRadians(currLat);
  var destLatRad = toRadians(destLat);
  
  //Get distance between coords
  var a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) + Math.sin(deltaLon/2) * Math.sin(deltaLon/2) * Math.cos(currLatRad) * Math.cos(destLatRad);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var metres = R * c;
  var yards = metres / metresInYard;
  var distance; // String representing distance in "human readable"" format
  if (metric) {
    if (metres < 1000) {
      distance = Math.round(metres) + "m";
    } else {
      distance = (metres / 1000).toFixed(2) + "km";
    }
  } else {
    if (yards < yardsInMile) {
      distance = Math.round(yards) + "yd";
    } else {
      distance = (yards / yardsInMile).toFixed(2) + "mi";
    }
  }
  
  //Get bearing
  var y = Math.sin(deltaLon) * Math.cos(destLatRad);
  var x = Math.cos(currLatRad)*Math.sin(destLatRad) - Math.sin(currLatRad)*Math.cos(destLatRad)*Math.cos(deltaLon);
  var bearing = (Math.round(toDegrees(Math.atan2(y, x))) + 360) % 360;
  return {distance: distance, bearing: bearing};
}


    
   