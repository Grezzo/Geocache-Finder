#include <pebble.h>
#include "cache_direction_window.h"
#include "messaging.h"
#include "arrow_layer.h"

//TODO use true heading?
//    vibrate if close to cahce
//get bearing sent from JS in trigangle

static TextLayer *s_textlayer;
static StatusBarLayer *s_status_bar_layer;
static ArrowLayer * s_arrow_layer;
static char buffer[100];

static bool hasHeading;
static bool hasLocationDetails;

static char* distance;
static int bearing;
static char* accuracy;
static int heading;

static void update_details_window() {
  if (hasHeading && hasLocationDetails) {
    //heading = /*360*/TRIG_MAX_ANGLE - heading;
    int direction = (bearing + heading) % TRIG_MAX_ANGLE;

//     snprintf(buffer, 100, "Distance: %s\nDirection: %i\nBearing(g): %i\nHeading(c): %i\nAccuracy: %s",
//              distance,
//              direction,
//              bearing,
//              heading,
//              accuracy
//             );
    snprintf(buffer, 100, "Distance: %s\n\nAccuracy: %s",
             distance,
             accuracy
            );
    text_layer_set_text(s_textlayer, buffer);
    arrow_layer_set_angle(s_arrow_layer, direction);
    //Turn on light in case it too so long to get results that it had gone dark
    //light_enable_interaction();
    //Vibrate to indicate that results are ready in case it took ages
    //vibes_short_pulse();
  }
}

void update_location_details(char* new_distance, int new_bearing, char* new_accuracy) {
  distance = new_distance;
  bearing = DEG_TO_TRIGANGLE(new_bearing);
  accuracy = new_accuracy;
  hasLocationDetails = true;
  if (hasHeading) {
    update_details_window();
  }
}

void update_heading(int new_heading) {
  heading = new_heading;
  hasHeading = true;
  if (hasLocationDetails) {
    update_details_window();
  }
}

static void compass_heading_handler(CompassHeadingData heading_data) {
  // Is the compass calibrated?
  switch(heading_data.compass_status) {
    case CompassStatusDataInvalid:
      APP_LOG(APP_LOG_LEVEL_INFO, "Not yet calibrated.");
      break;
    case CompassStatusCalibrating:
      APP_LOG(APP_LOG_LEVEL_INFO, "Calibration in progress. Heading is %ld",
                             TRIGANGLE_TO_DEG(heading_data.true_heading));
      break;
    case CompassStatusCalibrated:
      APP_LOG(APP_LOG_LEVEL_INFO, "Calibrated! Heading is %ld",
                             heading_data.true_heading);
    update_heading(/*TRIGANGLE_TO_DEG(*/heading_data.true_heading/*)*/);
      break;
  }
}


static void handle_window_load(Window *window) {
  
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  s_status_bar_layer = status_bar_layer_create();
  layer_add_child(window_layer, status_bar_layer_get_layer(s_status_bar_layer));
  
  s_arrow_layer = arrow_layer_create(
    GRect(0, STATUS_BAR_LAYER_HEIGHT, bounds.size.w, 100),
    0,
    GColorBlack,
    true,
    1
  );
  
  layer_add_child(window_layer, s_arrow_layer);

  hasHeading = false;
  hasLocationDetails = false;
  s_textlayer = text_layer_create(GRect(
    0,
    STATUS_BAR_LAYER_HEIGHT + 100,
    bounds.size.w,
    bounds.size.h - STATUS_BAR_LAYER_HEIGHT - 100
  ));
  //text_layer_set_font(s_textlayer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text(s_textlayer, "Getting cache details...");
  layer_add_child(window_layer, (Layer *)s_textlayer);
  
  
  
  compass_service_subscribe(compass_heading_handler);  
}

static void handle_window_unload(Window* window) {
  status_bar_layer_destroy(s_status_bar_layer);
  arrow_layer_destroy(s_arrow_layer);
  window_destroy(window);
  text_layer_destroy(s_textlayer);
  compass_service_unsubscribe();
  send_message(AppKeyStopLocationUpdates);
}

void show_cache_direction_window(char *geocode) {
  Window *window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = handle_window_load,
    .unload = handle_window_unload,
  });
  window_stack_push(window, true);
  send_message_with_string(AppKeyGetCacheDetails, geocode);
}

void hide_cache_direction_window(void) {
  Window* window = window_stack_get_top_window();
  window_stack_remove(window, true);
}
