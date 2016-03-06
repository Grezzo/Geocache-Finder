#include <pebble.h>
#include "cache_direction_window.h"
#include "messaging.h"


static TextLayer *s_textlayer;
//static char* s_geocode;

static void get_cache_details(char* geocode) {
  text_layer_set_text(s_textlayer, geocode);
  //send_message_to_js();
  send_message_with_string(AppKeyGetCacheDetails, geocode);
}

static void handle_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  s_textlayer = text_layer_create(bounds);
  text_layer_set_text(s_textlayer, "Getting cache details...");
  layer_add_child(window_layer, (Layer *)s_textlayer);
}

static void handle_window_unload(Window* window) {
  window_destroy(window);
  text_layer_destroy(s_textlayer);
}

void show_cache_direction_window(char *geocode) {
  //s_geocode = geocode;
  Window *window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = handle_window_load,
    .unload = handle_window_unload,
  });
  window_stack_push(window, true);
  get_cache_details(geocode);
}

void hide_cache_direction_window(void) {
  Window* window = window_stack_get_top_window();
  window_stack_remove(window, true);
}
