/*globals module*/ //Stop complaining about module being undefined!
module.exports.htmlUnescape = htmlUnescape;
module.exports.getDecimalDegrees = getDecimalDegrees;
module.exports.caseInsensitiveCompare = caseInsensitiveCompare;
module.exports.combineArrays = combineArrays;

function htmlUnescape(string) {    
  string = string.replace(/&amp;/g, "&");
  string = string.replace(/&#39;/g, "'");
  string = string.replace(/&lt;/g, "<");
  string = string.replace(/&gt;/g, ">");
  string = string.replace(/&quot;/g, "\"");
  //could do this better. especially with numbers! Maybe get a list of entities from a node.js library
  return string;
}

function getDecimalDegrees(coords) {
  var latParts = coords.match(/(N|S) (\d+)° (\d+\.*\d*)/);
  var lonParts = coords.match(/(E|W) (\d+)° (\d+\.*\d*)/);
  var lat = (latParts[1] === "N" ? 1 : -1) * (parseInt(latParts[2], 10) + (parseFloat(latParts[3]) / 60));
  var lon = (lonParts[1] === "E" ? 1 : -1) * (parseInt(lonParts[2], 10) + (parseFloat(lonParts[3]) / 60));
  coords = {latitude: lat, longitude: + lon};
  return coords;
}

function caseInsensitiveCompare(str1, str2) {
  return (str1.toUpperCase() === str2.toUpperCase());
}

function combineArrays(array1, array2) {
  array2.forEach(function(geocache) {
    array1.push(geocache);
  });
  return array1;
}