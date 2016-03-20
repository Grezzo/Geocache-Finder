#include <pebble.h>
#include "cache_details.h"
#include "messaging.h"
#include "arrow_layer.h"

//TODO:
//    vibrate if close to cahce
//get bearing sent from JS in trigangle

static TextLayer *s_textlayer;
static StatusBarLayer *s_status_bar_layer;
static ArrowLayer * s_arrow_layer;

static bool hasHeading;
static bool hasLocationDetails;

static char* distance;
static int bearing;
static int heading;

static void update_details_window() {
  if (hasHeading && hasLocationDetails) {
    int direction = (bearing + heading) % TRIG_MAX_ANGLE;
    text_layer_set_text(s_textlayer, distance);
    APP_LOG(APP_LOG_LEVEL_DEBUG, "%i", text_layer_get_content_size(s_textlayer).h);
    arrow_layer_set_angle(s_arrow_layer, direction);
  }
}

void update_location_details(char* new_distance, int new_bearing) {
  distance = new_distance;
  bearing = DEG_TO_TRIGANGLE(new_bearing);
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
    GRect(0, STATUS_BAR_LAYER_HEIGHT, bounds.size.w, bounds.size.h - 31 - STATUS_BAR_LAYER_HEIGHT),
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
    bounds.size.h - 31,
    bounds.size.w,
    31
  ));
  text_layer_set_font(s_textlayer, fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD));
  text_layer_set_text_alignment(s_textlayer, GTextAlignmentCenter);
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

void show_cache_details(char *geocode) {
  Window *window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = handle_window_load,
    .unload = handle_window_unload,
  });
  window_stack_push(window, true);
  send_message_with_string(AppKeyGetCacheDetails, geocode);
}

void hide_cache_details(void) {
  Window* window = window_stack_get_top_window();
  window_stack_remove(window, true);
}
