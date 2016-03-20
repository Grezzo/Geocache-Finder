#include <pebble.h>
#include "home.h"
#include "messaging.h"

static Window *s_home_window;
static StatusBarLayer *s_status_bar_layer;
static BitmapLayer *s_large_logo_layer;
static GBitmap *s_large_logo;
static ActionBarLayer *s_action_bar_layer;
//static GBitmap *s_saved_icon;
static GBitmap *s_settings_icon;
static GBitmap *s_search_icon;
static TextLayer *s_status_layer;


static void get_geocaches_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(s_status_layer, "Getting geocaches...");
  send_message(AppKeyGetGeocaches);
}

static void settings_click_handler() {
  send_message(AppKeyGetSettings);
}

void update_home_status_text(char *text) {
  text_layer_set_text(s_status_layer, text);
}

static void home_window_click_config_provider(void *context) {
  // Register the ClickHandlers
  window_single_click_subscribe(BUTTON_ID_SELECT, get_geocaches_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, settings_click_handler);
}

void enable_action_bar() {
  action_bar_layer_set_click_config_provider(s_action_bar_layer, home_window_click_config_provider);
}

static void home_window_load(Window *window) {
  
  // Get information about the Window
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  
  s_status_bar_layer = status_bar_layer_create();
  
  s_large_logo_layer = bitmap_layer_create(GRect(0, STATUS_BAR_LAYER_HEIGHT, bounds.size.w - ACTION_BAR_WIDTH, 104));
  s_large_logo = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_LARGE_LOGO);
  bitmap_layer_set_bitmap(s_large_logo_layer, s_large_logo);
  
  // Create the TextLayer with specific bounds
  s_status_layer = text_layer_create(
    GRect(0, 104 + STATUS_BAR_LAYER_HEIGHT, bounds.size.w - ACTION_BAR_WIDTH, bounds.size.h-104)
  );
  text_layer_set_text_alignment(s_status_layer, GTextAlignmentCenter);
  #ifdef PBL_COLOR
    window_set_background_color(s_home_window, GColorDarkGreen);
    text_layer_set_text_color(s_status_layer, GColorWhite);
    text_layer_set_background_color(s_status_layer, GColorClear);
  #endif

  text_layer_set_text(s_status_layer, "Waiting for phone");
    
  // Add it as a child layer to the Window's root layer
  layer_add_child(window_layer, bitmap_layer_get_layer(s_large_logo_layer));
  layer_add_child(window_layer, text_layer_get_layer(s_status_layer));
  
  s_action_bar_layer = action_bar_layer_create();
  s_settings_icon = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_SETTINGS_ICON);
  s_search_icon = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_SEARCH_ICON);
//  s_saved_icon = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_SAVED_ICON);
//  action_bar_layer_set_icon(s_action_bar_layer, BUTTON_ID_UP, s_saved_icon);
  action_bar_layer_set_icon(s_action_bar_layer, BUTTON_ID_SELECT, s_search_icon);
  action_bar_layer_set_icon(s_action_bar_layer, BUTTON_ID_DOWN, s_settings_icon);
  action_bar_layer_add_to_window(s_action_bar_layer, s_home_window);
  layer_add_child(window_layer, status_bar_layer_get_layer(s_status_bar_layer));
}

static void home_window_unload(Window *window) {
  // Destroy TextLayer
  status_bar_layer_destroy(s_status_bar_layer);
  gbitmap_destroy(s_large_logo);
  bitmap_layer_destroy(s_large_logo_layer);
  text_layer_destroy(s_status_layer);
  gbitmap_destroy(s_settings_icon);
  gbitmap_destroy(s_search_icon);
//  gbitmap_destroy(s_saved_icon);
  action_bar_layer_remove_from_window(s_action_bar_layer);
  action_bar_layer_destroy(s_action_bar_layer);


}

void home_window_init() {
  // Create home Window element and assign to pointer
  s_home_window = window_create();
  
  // Set handlers to manage the elements inside the Window
  window_set_window_handlers(s_home_window, (WindowHandlers) {
    .load = home_window_load,
    .unload = home_window_unload
  });

  // Show the Window on the watch, with animated=true
  window_stack_push(s_home_window, true);
}

void home_window_deinit() {
  // Destroy Window
  window_destroy(s_home_window);
}


